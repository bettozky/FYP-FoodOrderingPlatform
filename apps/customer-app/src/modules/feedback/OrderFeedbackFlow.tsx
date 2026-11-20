import React, { useEffect, useRef, useState } from "react";
import { api } from "../../shared/api/client";
import type { Order } from "../../shared/api/types";
import { useLive } from "../ordering/LiveDataContext";
import ReviewOrderPopup from "./ReviewOrderPopup";
import RateAppPopup from "./RateAppPopup";

// Week task 3: after an order is completed, two pop-ups in a row.
//   1. "Review your order"  (only if the order still has dishes to review)
//   2. "Rate the app"       (only when the server says it is time to ask)
// Started by the server's "order_completed" notice, so it works whichever screen the customer is on.
// `blocked` holds it back while a more urgent pop-up (food ready, out of stock) is on screen.
type Step = { kind: "idle" } | { kind: "review"; order: Order; noticeId: string } | { kind: "rate"; orderId: string };

export default function OrderFeedbackFlow({ blocked }: { blocked: boolean }) {
  const { notifications, ack } = useLive();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const handled = useRef(new Set<string>());

  const notice = notifications.find((n) => n.type === "order_completed" && !handled.current.has(n.id));

  useEffect(() => {
    if (blocked || step.kind !== "idle" || !notice) return;
    handled.current.add(notice.id);
    const orderId = String(notice.data?.orderId ?? "");
    api<{ order: Order }>("GET", `/orders/${orderId}`)
      .then(({ order }) => {
        if (order.canReview) setStep({ kind: "review", order, noticeId: notice.id });
        else {
          ack(notice.id);
          askAboutApp(orderId);
        }
      })
      .catch(() => ack(notice.id));
  }, [blocked, step.kind, notice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function askAboutApp(orderId: string) {
    try {
      const r = await api<{ shouldAsk: boolean }>("GET", "/feedback/app-rating");
      setStep(r.shouldAsk ? { kind: "rate", orderId } : { kind: "idle" });
    } catch {
      setStep({ kind: "idle" });
    }
  }

  return (
    <>
      <ReviewOrderPopup
        order={step.kind === "review" ? step.order : null}
        onDone={() => {
          if (step.kind !== "review") return;
          ack(step.noticeId);
          const id = step.order.id;
          setStep({ kind: "idle" });
          // A short pause so the first pop-up has closed before the second opens.
          setTimeout(() => askAboutApp(id), 350);
        }}
      />
      <RateAppPopup visible={step.kind === "rate"} orderId={step.kind === "rate" ? step.orderId : undefined} onDone={() => setStep({ kind: "idle" })} />
    </>
  );
}
