import dotenv from "dotenv";

dotenv.config();

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);

export const env = {
  port: num(process.env.PORT, 3001),
  openaiApiKey: process.env.OPENAI_API_KEY,
  // Model used by the AI assistant. Override with AI_MODEL in .env.
  aiModel: process.env.AI_MODEL ?? "gpt-6-luna",

  // ---- business rules (FR / NFR references in docs/requirements) ----
  // FR-5.5: merchant has 10 minutes to accept a new paid order.
  orderResponseMs: num(process.env.ORDER_RESPONSE_MS, 10 * 60 * 1000),
  // FR-5.8: restaurant has 30 minutes to reply to a reservation.
  reservationResponseMs: num(process.env.RESERVATION_RESPONSE_MS, 30 * 60 * 1000),
  // FR-1.2: minimum age at sign-up. The requirements do not give the number; 18 is an assumption to confirm.
  minAge: num(process.env.MIN_AGE, 18),
  // Delivery fee for orders with delivery items (simulated quote).
  deliveryFee: num(process.env.DELIVERY_FEE, 3.5),
  // Booking deposit charged when a customer picks "Pay now" for a reservation (assumption to confirm).
  bookingDeposit: num(process.env.BOOKING_DEPOSIT, 5),
  // FR-3.5: customers can cancel or modify up to this long before the slot.
  reservationCutoffMs: num(process.env.RESERVATION_CUTOFF_MS, 2 * 60 * 60 * 1000),
  // FR-3.5: reminder before a confirmed reservation.
  reminderMs: num(process.env.RESERVATION_REMINDER_MS, 60 * 60 * 1000),
  // Simulated delivery provider: how long each stage lasts.
  deliveryStageMs: num(process.env.DELIVERY_STAGE_MS, 10 * 1000),
  // How often the server checks deadlines and delivery progress.
  sweepMs: num(process.env.SWEEP_MS, 1000),
  timeZone: process.env.APP_TIME_ZONE ?? "Asia/Kuching",
  isProduction: process.env.NODE_ENV === "production",
};
