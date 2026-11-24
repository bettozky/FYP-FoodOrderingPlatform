// Voice-mode extras for the CUSTOMER assistant: what to say out loud, and the three things the assistant may
// help with besides answering: add a dish to the cart, open an order's tracking screen, and open the Pay screen.
//
// Safety: the AI only names WHICH dish or order. The server checks it belongs to this customer (from the login
// token) and is possible right now, and writes the question itself. Nothing is bought or paid here:
//   - add to cart: the app asks Yes / No, re-checks price and stock (GET /api/ai/dishes/:id), then adds it;
//   - pay: the app asks Yes / No, then only OPENS the Pay screen, where the customer pays themselves.
import { db } from "../../store/db.js";
import type { Order } from "../../store/types.js";
import type { AssistantContext } from "./ai-assistant.tools.js";
import { speakMoney, type MerchantLanguage } from "./ai-merchant.service.js";

export type Lang = MerchantLanguage; // "en" | "ms" | "zh"
export const CUSTOMER_ACTIONS = ["add_to_cart", "open_order", "pay"] as const;
export type CustomerActionType = (typeof CUSTOMER_ACTIONS)[number];
export type CustomerActionRequest = { type: CustomerActionType; dishId: string | null; orderId: string | null };

/** A Yes / No question. Yes makes the app add the dish, or open the Pay screen. */
export type CustomerConfirm =
  | { kind: "add_to_cart"; summary: string; dishId: string }
  | { kind: "pay"; summary: string; orderId: string };
/** Open a screen straight away (only looking, nothing changes). */
export type CustomerNavigate = { screen: "OrderTracking"; orderId: string };
/** Several orders could be paid: the customer picks one. */
export type CustomerChoices = { kind: "pay"; question: string; options: { orderId: string; label: string }[] };

export type VoiceExtras = {
  reply: string;
  spoken: string;
  language: Lang;
  asksQuestion: boolean;
  confirm: CustomerConfirm | null;
  navigate: CustomerNavigate | null;
  choices: CustomerChoices | null;
};

const ACTIVE = new Set(["awaiting_merchant", "awaiting_payment", "preparing"]);
const t = (lang: Lang, en: string, ms: string, zh: string) => (lang === "ms" ? ms : lang === "zh" ? zh : en);

export function detectLanguage(text: string): Lang {
  if (/[一-鿿]/.test(text)) return "zh";
  if (/\b(saya|berapa|mana|nak|mahu|bayar|pesanan|makanan|pedas|boleh|apa|ada|tak|tolong|cari)\b/i.test(text)) return "ms";
  return "en";
}

const rm = (n: number) => `RM${n.toFixed(2)}`;
const minutesLeft = (o: Order) => Math.max(1, Math.round(((o.payBy ?? 0) - Date.now()) / 60000));

/** The customer's own orders, newest first. customerId always comes from the login token. */
function ownOrders(customerId: string): Order[] {
  return [...db.orders.values()].filter((o) => o.customerId === customerId).sort((a, b) => b.createdAt - a.createdAt);
}

/** Orders the customer can pay right now: the stall confirmed, paying online, and the time has not run out. */
export function payableOrders(customerId: string): Order[] {
  return ownOrders(customerId)
    .filter((o) => o.status === "awaiting_payment" && (o.payBy ?? 0) > Date.now() && o.paymentMethod !== "cash")
    .sort((a, b) => (a.payBy ?? 0) - (b.payBy ?? 0)); // most urgent first
}

function payLabel(o: Order, lang: Lang): string {
  return t(lang, `${o.merchantName}, ${rm(o.total)}, ${minutesLeft(o)} min left`, `${o.merchantName}, ${rm(o.total)}, tinggal ${minutesLeft(o)} minit`, `${o.merchantName}，${rm(o.total)}，剩 ${minutesLeft(o)} 分钟`);
}

/** Why nothing can be paid right now (shown and spoken instead of a Yes / No). */
function nothingToPay(customerId: string, lang: Lang): string {
  const active = ownOrders(customerId).filter((o) => ACTIVE.has(o.status));
  const waiting = active.find((o) => o.status === "awaiting_merchant");
  if (waiting) return t(lang, `${waiting.merchantName} hasn't confirmed your order yet. You can pay once they do.`, `${waiting.merchantName} belum sahkan pesanan anda. Anda boleh bayar selepas itu.`, `${waiting.merchantName} 还没确认你的订单，确认后就可以付款。`);
  const cash = ownOrders(customerId).find((o) => o.status === "awaiting_payment" && o.paymentMethod === "cash");
  if (cash) return t(lang, `Your ${cash.merchantName} order is cash, so please pay at the stall.`, `Pesanan ${cash.merchantName} anda ialah tunai, sila bayar di gerai.`, `你在 ${cash.merchantName} 的订单是现金付款，请到摊位付款。`);
  const late = ownOrders(customerId).find((o) => o.status === "awaiting_payment");
  if (late) return t(lang, `The payment time for your ${late.merchantName} order has run out.`, `Masa bayaran untuk pesanan ${late.merchantName} anda sudah tamat.`, `你在 ${late.merchantName} 的订单付款时间已过。`);
  return t(lang, "You have no orders waiting for payment.", "Tiada pesanan yang menunggu bayaran.", "你没有待付款的订单。");
}

/**
 * Checks what the AI (or the offline fallback) asked for and turns it into a Yes / No question, a screen to open,
 * a list to pick from, or an explanation. `base` is the AI's answer; parts of it may be replaced.
 */
export function applyCustomerAction(
  base: { reply: string; spoken: string; language: Lang; asksQuestion: boolean },
  request: CustomerActionRequest | null,
  customerId: string,
  context: AssistantContext
): VoiceExtras {
  const lang = base.language;
  const out: VoiceExtras = { ...base, confirm: null, navigate: null, choices: null };
  const explain = (text: string): VoiceExtras => ({ ...out, reply: text, spoken: speakMoney(text, lang), asksQuestion: false });
  if (!request) return out;

  if (request.type === "add_to_cart") {
    const dish = context.dishes.find((d) => d.id === request.dishId);
    const shop = dish && context.merchants.find((m) => m.id === dish.merchantId);
    if (!dish || !shop) return explain(t(lang, "I couldn't find that dish.", "Saya tidak jumpa hidangan itu.", "找不到这道菜。"));
    if (dish.soldOut || !shop.openNow) return explain(t(lang, `${dish.name} can't be ordered right now.`, `${dish.name} tidak boleh dipesan sekarang.`, `${dish.name} 现在不能点。`));
    const summary = t(lang, `Add ${dish.name} (${rm(dish.price)}) from ${shop.name} to your cart?`, `Tambah ${dish.name} (${rm(dish.price)}) dari ${shop.name} ke troli?`, `把 ${shop.name} 的 ${dish.name}（${rm(dish.price)}）加入购物车？`);
    return {
      ...out,
      reply: base.reply || summary,
      spoken: base.spoken || speakMoney(summary, lang),
      asksQuestion: true,
      confirm: { kind: "add_to_cart", summary, dishId: dish.id },
    };
  }

  if (request.type === "open_order") {
    const own = ownOrders(customerId);
    const order = own.find((o) => o.id === request.orderId) ?? own.find((o) => ACTIVE.has(o.status));
    if (!order) return explain(t(lang, "You have no active orders right now.", "Anda tiada pesanan aktif sekarang.", "你现在没有进行中的订单。"));
    // Offline there is no AI answer, so say which order is being opened.
    const opening = t(lang, `Opening your ${order.merchantName} order.`, `Membuka pesanan ${order.merchantName} anda.`, `正在打开你在 ${order.merchantName} 的订单。`);
    return {
      ...out,
      reply: base.reply || opening,
      spoken: base.spoken || opening,
      navigate: { screen: "OrderTracking", orderId: order.id },
    };
  }

  // pay
  const payable = payableOrders(customerId);
  const chosen = payable.find((o) => o.id === request.orderId);
  const order = chosen ?? (payable.length === 1 ? payable[0] : undefined);
  if (order) {
    const summary = t(lang, `Open payment for your ${payLabel(order, lang)}?`, `Buka bayaran untuk ${payLabel(order, lang)}?`, `打开付款页面：${payLabel(order, lang)}？`);
    return {
      ...out,
      reply: base.reply || summary,
      spoken: base.spoken || speakMoney(summary, lang),
      asksQuestion: true,
      confirm: { kind: "pay", summary, orderId: order.id },
    };
  }
  if (payable.length > 1) {
    const question = t(lang, "Which order do you want to pay?", "Pesanan mana yang anda mahu bayar?", "你要付哪一笔订单？");
    return {
      ...out,
      reply: question,
      spoken: speakMoney(`${question} ${payable.map((o) => o.merchantName).join(t(lang, " or ", " atau ", " 还是 "))}?`, lang),
      asksQuestion: true,
      choices: { kind: "pay", question, options: payable.map((o) => ({ orderId: o.id, label: payLabel(o, lang) })) },
    };
  }
  return explain(nothingToPay(customerId, lang));
}

/** Offline fallback: spots "where is my order" and "I want to pay" in English, Malay or Chinese. */
export function customerActionFromWords(text: string): CustomerActionRequest | null {
  const s = text.toLowerCase();
  if (/\bpay\b|payment|bayar|付款|支付|买单/.test(s)) return { type: "pay", dishId: null, orderId: null };
  if (/where.*order|order status|track|my order|status pesanan|pesanan.*mana|mana.*pesanan|订单|我的单/.test(s)) return { type: "open_order", dishId: null, orderId: null };
  return null;
}
