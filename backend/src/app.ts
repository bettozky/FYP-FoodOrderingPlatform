import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { MEDIA_DIR } from "./jobs/fetchDishPhotos.js";
import { LOCAL_PUBLIC_DIR } from "./lib/storage.js";
import { errorHandler } from "./lib/http.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { saveAfterWrites } from "./middleware/persist.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { addressesRouter } from "./modules/account/addresses.routes.js";
import { favouritesRouter } from "./modules/account/favourites.routes.js";
import { loyaltyRouter } from "./modules/account/loyalty.routes.js";
import { aiAssistantRouter } from "./modules/ai-assistant/ai-assistant.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { callsRouter } from "./modules/calls/calls.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { deliveryRouter } from "./modules/delivery/delivery.routes.js";
import { merchantReservationsRouter, reservationsRouter } from "./modules/dine-in/reservations.routes.js";
import { analyticsRouter } from "./modules/merchants/analytics.routes.js";
import { catalogRouter } from "./modules/merchants/catalog.routes.js";
import { portalRouter } from "./modules/merchants/portal.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { merchantOrdersRouter, ordersRouter } from "./modules/ordering/ordering.routes.js";
import { merchantReviewsRouter, reviewsRouter } from "./modules/reviews/reviews.routes.js";
import { applicationsRouter, jobsRouter, merchantApplicationsRouter } from "./modules/jobs/jobs.routes.js";
import { filesRouter } from "./modules/jobs/files.routes.js";
import { adminAnnouncementsRouter, announcementsRouter, merchantAnnouncementsRouter } from "./modules/announcements/announcements.routes.js";
import { avatarRouter, uploadsRouter } from "./modules/uploads/uploads.routes.js";
import { resetStore, storageMode } from "./store/persistence/index.js";
import { usingSupabaseStorage } from "./config/env.js";

export const app = express();

app.set("trust proxy", 1); // correct client addresses for the rate limiter behind a hosting proxy
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(saveAfterWrites);

// Photos: demo dish photos, and uploads kept on this computer when Supabase Storage is not set up.
app.use("/media/uploads", express.static(LOCAL_PUBLIC_DIR, { maxAge: "1d" }));
app.use("/media", express.static(MEDIA_DIR, { maxAge: "1d" }));

app.get("/", (_req, res) => {
  res.json({ message: "ScootMeal backend is running" });
});

// For hosting checks and a quick "is it connected?" look. No secrets in here.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, storage: storageMode(), fileStorage: usingSupabaseStorage ? "supabase" : "local", time: Date.now() });
});

// One router per module (NFR-8). Add new modules here as they are built. `npm run routes` lists every URL.
app.use("/api/auth/me/avatar", avatarRouter);
app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/calls", callsRouter);
app.use("/api/jobs", jobsRouter); // /api/jobs/:id and applying (the list itself is in catalogRouter)
app.use("/api/applications", applicationsRouter);
app.use("/api/files", filesRouter);
app.use("/api", catalogRouter); // merchants, dishes, search, venues, vouchers, jobs
app.use("/api/orders", ordersRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/delivery", deliveryRouter);
app.use("/api/addresses", addressesRouter);
app.use("/api/favourites", favouritesRouter);
app.use("/api/loyalty", loyaltyRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/merchant/orders", merchantOrdersRouter);
app.use("/api/merchant/reservations", merchantReservationsRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/merchant/announcements", merchantAnnouncementsRouter);
app.use("/api/merchant/reviews", merchantReviewsRouter);
app.use("/api/merchant/applications", merchantApplicationsRouter);
app.use("/api/merchant", uploadsRouter);
app.use("/api/merchant", analyticsRouter);
app.use("/api/merchant", portalRouter);
app.use("/api/admin/announcements", adminAnnouncementsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/ai", rateLimit(env.aiRatePerMin, "ai"), aiAssistantRouter);

// Demo helper: put the seed data back (not mounted in production).
if (!env.isProduction) {
  app.post("/api/dev/reset", async (_req, res) => {
    await resetStore();
    res.json({ ok: true });
  });
}

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);
