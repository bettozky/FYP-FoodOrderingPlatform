// "Do" actions for the merchant assistant (step 10): sold out / back in stock, busy mode on / off,
// and starting a last-hour deal.
//
// Safety: the AI can only PROPOSE one of these fixed actions. The server checks the proposal (own dish,
// sensible numbers), keeps it as a pending action for 2 minutes, and changes nothing until the merchant
// answers Yes (POST /api/ai/merchant/actions/:id). Each pending action works once, only for the merchant
// it was made for.
import { randomUUID } from "node:crypto";

import { localDay, localHHMM } from "../../lib/time.js";
import { db } from "../../store/db.js";
import type { Dish, Merchant } from "../../store/types.js";
import { DEFAULT_BUSY_MODE } from "../merchants/busyMode.js";
import { dealMinutes, minutesUntil } from "../merchants/deals.js";

export const ACTION_TYPES = ["sold_out", "back_in_stock", "busy_on", "busy_off", "start_deal"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
export type Lang = "en" | "ms" | "zh";

/** What the AI (or the offline fallback) asks for. Nothing has happened yet. */
export type ActionRequest = { type: ActionType; dishId: string | null; percent: number | null; minutes: number | null };

type Pending = {
  id: string;
  merchantId: string;
  request: ActionRequest;
  dealMinutes: number | null;
  language: Lang;
  expiresAt: number;
};

/** What the app shows: the question with Yes / No buttons. */
export type ConfirmCard = { id: string; summary: string; expiresAt: number };

const PENDING_MS = 2 * 60_000;
const pending = new Map<string, Pending>();

const t = (lang: Lang, en: string, ms: string, zh: string) => (lang === "ms" ? ms : lang === "zh" ? zh : en);

function ownDish(merchant: Merchant, dishId: string | null): Dish | undefined {
  const d = dishId ? db.dishes.get(dishId) : undefined;
  return d && d.merchantId === merchant.id ? d : undefined;
}

const isSoldOut = (d: Dish) => d.soldOut || d.stock === 0;

/** Today's closing time for the stall (its per-day hours if it set them). Same rule as last-hour deals. */
function closingTime(m: Merchant, now = new Date()): string {
  return m.weeklyHours?.find((h) => h.day === localDay(now))?.close ?? m.hours.close;
}

/**
 * Checks a proposed action against the stall's real data. Returns a confirm card (and keeps the action
 * pending), or a message explaining why it can't be done.
 */
export function proposeAction(
  merchant: Merchant,
  request: ActionRequest,
  language: Lang
): { confirm: ConfirmCard } | { problem: string } {
  const dish = ownDish(merchant, request.dishId);
  let summary: string;
  let minutes: number | null = null;

  switch (request.type) {
    case "sold_out":
      if (!dish) return { problem: t(language, "I couldn't find that dish on your menu.", "Saya tidak jumpa hidangan itu dalam menu anda.", "你的菜单里找不到这道菜。") };
      if (isSoldOut(dish)) return { problem: t(language, `${dish.name} is already sold out.`, `${dish.name} sudah habis dijual.`, `${dish.name} 已经售完了。`) };
      summary = t(language, `Mark ${dish.name} as sold out?`, `Tandakan ${dish.name} sebagai habis dijual?`, `把 ${dish.name} 标记为售完？`);
      break;
    case "back_in_stock":
      if (!dish) return { problem: t(language, "I couldn't find that dish on your menu.", "Saya tidak jumpa hidangan itu dalam menu anda.", "你的菜单里找不到这道菜。") };
      if (!isSoldOut(dish)) return { problem: t(language, `${dish.name} is already available.`, `${dish.name} sudah tersedia.`, `${dish.name} 已经有货了。`) };
      summary = t(language, `Put ${dish.name} back on sale?`, `Jual semula ${dish.name}?`, `重新上架 ${dish.name}？`);
      break;
    case "busy_on": {
      if (merchant.busyMode?.on) return { problem: t(language, "Busy mode is already on.", "Mod sibuk sudah dihidupkan.", "忙碌模式已经开启。") };
      const mode = merchant.busyMode ?? DEFAULT_BUSY_MODE;
      const what = mode.action === "pause"
        ? t(language, "pause new orders", "hentikan pesanan baru", "暂停新订单")
        : t(language, "warn customers", "beri amaran kepada pelanggan", "提醒顾客");
      summary = t(
        language,
        `Turn on busy mode? It will ${what} when the wait is over ${mode.limitMinutes} minutes.`,
        `Hidupkan mod sibuk? Ia akan ${what} bila masa menunggu lebih ${mode.limitMinutes} minit.`,
        `开启忙碌模式？等候超过 ${mode.limitMinutes} 分钟时会${what}。`
      );
      break;
    }
    case "busy_off":
      if (!merchant.busyMode?.on) return { problem: t(language, "Busy mode is already off.", "Mod sibuk sudah dimatikan.", "忙碌模式已经关闭。") };
      summary = t(language, "Turn off busy mode?", "Matikan mod sibuk?", "关闭忙碌模式？");
      break;
    case "start_deal": {
      if (!dish) return { problem: t(language, "I couldn't find that dish on your menu.", "Saya tidak jumpa hidangan itu dalam menu anda.", "你的菜单里找不到这道菜。") };
      if (isSoldOut(dish)) return { problem: t(language, `${dish.name} is sold out, so it can't have a deal.`, `${dish.name} sudah habis, jadi tiada tawaran.`, `${dish.name} 已售完，不能做优惠。`) };
      // Same checks as the Menu screen's deal button (10-70% off, 5 minutes to 6 hours, or until closing).
      const checked = dealMinutes(
        request.minutes ? { percent: request.percent, minutes: request.minutes } : { percent: request.percent, untilClose: true },
        minutesUntil(closingTime(merchant), localHHMM())
      );
      if (typeof checked === "string") return { problem: checked };
      minutes = checked;
      const length = request.minutes
        ? t(language, `for ${checked} minutes`, `selama ${checked} minit`, `${checked} 分钟`)
        : t(language, "until closing", "sehingga tutup", "直到打烊");
      summary = t(
        language,
        `Start ${request.percent}% off ${dish.name} ${length}?`,
        `Mulakan diskaun ${request.percent}% untuk ${dish.name} ${length}?`,
        `${dish.name} 打 ${100 - Number(request.percent)} 折（减 ${request.percent}%），${length}？`
      );
      break;
    }
  }

  // Forget old pending actions, then keep this one.
  const now = Date.now();
  for (const [id, p] of pending) if (p.expiresAt < now) pending.delete(id);
  const id = randomUUID();
  const expiresAt = now + PENDING_MS;
  pending.set(id, { id, merchantId: merchant.id, request, dealMinutes: minutes, language, expiresAt });
  return { confirm: { id, summary, expiresAt } };
}

/** The merchant answered Yes or No. Only now does anything change. */
export function answerAction(
  merchant: Merchant,
  id: string,
  yes: boolean
): { status: "done" | "cancelled" | "expired" | "failed"; reply: string; language: Lang } {
  const p = pending.get(id);
  if (!p || p.merchantId !== merchant.id || p.expiresAt < Date.now()) {
    if (p && p.expiresAt < Date.now()) pending.delete(id);
    return { status: "expired", reply: "That request has expired. Please ask again.", language: "en" };
  }
  pending.delete(id); // works once only
  const lang = p.language;

  if (!yes) return { status: "cancelled", reply: t(lang, "OK, I didn't change anything.", "Baik, saya tidak ubah apa-apa.", "好的，我没有做任何更改。"), language: lang };

  const dish = ownDish(merchant, p.request.dishId);
  const gone = t(lang, "That dish is no longer on your menu.", "Hidangan itu sudah tiada dalam menu anda.", "这道菜已经不在你的菜单上了。");

  switch (p.request.type) {
    case "sold_out":
      if (!dish) return { status: "failed", reply: gone, language: lang };
      dish.soldOut = true;
      return { status: "done", reply: t(lang, `Done. ${dish.name} is now sold out.`, `Siap. ${dish.name} kini habis dijual.`, `好了，${dish.name} 已标记为售完。`), language: lang };
    case "back_in_stock":
      if (!dish) return { status: "failed", reply: gone, language: lang };
      dish.soldOut = false;
      if (dish.stock === 0) delete dish.stock; // a stock count of 0 also means sold out, so clear it
      return { status: "done", reply: t(lang, `Done. ${dish.name} is back on sale.`, `Siap. ${dish.name} dijual semula.`, `好了，${dish.name} 已重新上架。`), language: lang };
    case "busy_on":
      merchant.busyMode = { ...(merchant.busyMode ?? DEFAULT_BUSY_MODE), on: true };
      return { status: "done", reply: t(lang, "Done. Busy mode is on.", "Siap. Mod sibuk dihidupkan.", "好了，忙碌模式已开启。"), language: lang };
    case "busy_off":
      merchant.busyMode = { ...(merchant.busyMode ?? DEFAULT_BUSY_MODE), on: false };
      return { status: "done", reply: t(lang, "Done. Busy mode is off.", "Siap. Mod sibuk dimatikan.", "好了，忙碌模式已关闭。"), language: lang };
    case "start_deal": {
      if (!dish || isSoldOut(dish)) return { status: "failed", reply: gone, language: lang };
      const now = Date.now();
      dish.deal = { percent: Number(p.request.percent), startedAt: now, endsAt: now + (p.dealMinutes ?? 60) * 60000 };
      return {
        status: "done",
        reply: t(lang, `Done. ${p.request.percent}% off ${dish.name} has started.`, `Siap. Diskaun ${p.request.percent}% untuk ${dish.name} sudah bermula.`, `好了，${dish.name} 的 ${p.request.percent}% 优惠已开始。`),
        language: lang,
      };
    }
  }
}

/**
 * Offline fallback (no OpenAI): spots simple commands such as "mark nasi lemak sold out",
 * "busy mode on" or "30% off curry puff" in English, Malay or Chinese.
 */
export function actionFromWords(merchant: Merchant, text: string): ActionRequest | null {
  const s = text.toLowerCase();
  const dishes = [...db.dishes.values()].filter((d) => d.merchantId === merchant.id);
  // The longest matching dish name wins ("beef noodle soup" over "noodle").
  const dish = dishes.filter((d) => s.includes(d.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
  const none = { dishId: null, percent: null, minutes: null };

  if (/busy mode|mod sibuk|忙碌模式/.test(s)) {
    if (/\boff\b|turn off|matikan|tutup|关/.test(s)) return { type: "busy_off", ...none };
    if (/\bon\b|turn on|hidupkan|buka|开/.test(s)) return { type: "busy_on", ...none };
  }
  if (!dish) return null;
  const percent = /(\d{1,2})\s?%/.exec(s)?.[1];
  if (percent && /off|diskaun|discount|优惠|折/.test(s)) return { type: "start_deal", dishId: dish.id, percent: Number(percent), minutes: null };
  if (/back|available again|in stock|ada semula|dah ada|jual semula|有货|恢复|重新上架/.test(s)) return { type: "back_in_stock", dishId: dish.id, percent: null, minutes: null };
  if (/sold out|habis|售完|卖完|没有了/.test(s)) return { type: "sold_out", dishId: dish.id, percent: null, minutes: null };
  return null;
}
