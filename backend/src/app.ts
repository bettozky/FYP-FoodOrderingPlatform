import express from "express";
import cors from "cors";
import { errorHandler } from "./lib/http.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { aiAssistantRouter } from "./modules/ai-assistant/ai-assistant.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { deliveryRouter } from "./modules/delivery/delivery.routes.js";
import { merchantReservationsRouter, reservationsRouter } from "./modules/dine-in/reservations.routes.js";
import { callsRouter } from "./modules/calls/calls.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { catalogRouter, merchantRouter } from "./modules/merchants/merchants.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { merchantOrdersRouter, ordersRouter } from "./modules/ordering/ordering.routes.js";
import { resetDb } from "./store/db.js";
import { env } from "./config/env.js";
import { MEDIA_DIR } from "./jobs/fetchDishPhotos.js";

export const app = express();

app.use(cors());
app.use(express.json());
// Dish photos (and later uploads): GET /media/dishes/d1.jpg
app.use("/media", express.static(MEDIA_DIR, { maxAge: "1d" }));

app.get("/", (_req, res) => {
  res.json({ message: "ScootMeal backend is running" });
});

// One router per module (NFR-8). Add new modules here as they are built.
app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/calls", callsRouter);
app.use("/api", catalogRouter); // merchants, dishes, venues, vouchers, jobs
app.use("/api/orders", ordersRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/delivery", deliveryRouter);
app.use("/api/merchant/orders", merchantOrdersRouter);
app.use("/api/merchant/reservations", merchantReservationsRouter);
app.use("/api/merchant", merchantRouter);
app.use("/api/admin", adminRouter);
app.use("/api/ai", aiAssistantRouter);

// Demo helper: put the seed data back (not mounted in production).
if (!env.isProduction) {
  app.post("/api/dev/reset", (_req, res) => {
    resetDb();
    res.json({ ok: true });
  });
}

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);
