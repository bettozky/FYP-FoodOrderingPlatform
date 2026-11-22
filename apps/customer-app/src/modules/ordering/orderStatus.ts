import i18n from "i18next";
import { Order, OrderItem } from "../../shared/api/types";
import type en from "../../shared/i18n/en.json";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral";
type StatusKey = `status.${keyof (typeof en)["status"]}`;
const t = (k: StatusKey): string => i18n.t(k); // labels in the app's current language

export function orderBadge(o: Order): { label: string; tone: Tone } {
  if (o.decision === "pending") return { label: t("status.needsDecision"), tone: "warning" };
  switch (o.status) {
    case "awaiting_merchant": return { label: t("status.awaitingRestaurant"), tone: "warning" };
    case "awaiting_payment": return { label: t("status.payNow"), tone: "success" };
    case "preparing": return o.items.some((i) => i.status === "ready") ? { label: t("status.readyToCollect"), tone: "success" } : { label: t("status.preparing"), tone: "primary" };
    case "completed": return { label: t("status.completed"), tone: "success" };
    case "rejected": return { label: t("status.declined"), tone: "danger" };
    case "expired": return { label: o.cancelReason === "not_paid" ? t("status.notPaid") : t("status.noReply"), tone: "danger" };
    case "cancelled": return { label: t("status.cancelled"), tone: "danger" };
  }
}

/** The stall has not started cooking until the order is confirmed AND paid, so say what is really happening. */
export function itemBadge(i: OrderItem, orderStatus?: Order["status"]): { label: string; tone: Tone } {
  if (i.status === "preparing" && orderStatus === "awaiting_merchant") return { label: t("status.waitingStall"), tone: "warning" };
  if (i.status === "preparing" && orderStatus === "awaiting_payment") return { label: t("status.waitingPayment"), tone: "warning" };
  switch (i.status) {
    case "preparing": return { label: t("status.preparing"), tone: "primary" };
    case "ready": return { label: t("status.readyCollect"), tone: "success" };
    case "collected": return { label: t("status.collected"), tone: "success" };
    case "handed_over": return { label: t("status.withRider"), tone: "primary" };
    case "delivered": return { label: t("status.delivered"), tone: "success" };
    case "out_of_stock": return { label: t("status.outOfStock"), tone: "danger" };
    case "cancelled": return { label: t("status.cancelled"), tone: "danger" };
  }
}

export const isActive = (o: Order) => o.status === "awaiting_merchant" || o.status === "awaiting_payment" || o.status === "preparing";
