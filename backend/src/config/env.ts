// All settings in one place. Everything can be changed from backend/.env (see .env.example).
import dotenv from "dotenv";

dotenv.config();

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);
const flag = (v: string | undefined, d: boolean) => (v === undefined || v === "" ? d : !/^(0|false|no|off)$/i.test(v));
const text = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

const supabaseUrl = text(process.env.SUPABASE_URL)?.replace(/\/+$/, "");

export const env = {
  // ---- server ----
  port: num(process.env.PORT, 3001),
  isProduction: process.env.NODE_ENV === "production",
  /** POST /api/dev/reset wipes all data, so it is OFF unless you set ENABLE_DEV_RESET=1 (and never works in production). */
  enableDevReset: process.env.NODE_ENV !== "production" && /^(1|true|yes|on)$/i.test(process.env.ENABLE_DEV_RESET ?? ""),
  timeZone: process.env.APP_TIME_ZONE ?? "Asia/Kuching",
  /** Public address of this server, used to build links to locally stored uploads (only needed behind a proxy). */
  publicUrl: text(process.env.PUBLIC_URL)?.replace(/\/+$/, ""),

  // ---- database (Supabase or any PostgreSQL). Leave DATABASE_URL empty to run on in-memory demo data. ----
  databaseUrl: text(process.env.DATABASE_URL),
  /** "auto" = use SSL for every host except localhost (what Supabase needs). */
  databaseSsl: (process.env.DATABASE_SSL ?? "auto").toLowerCase() as "auto" | "true" | "false",
  /** How often changed data is saved to the database (milliseconds). Changes from API calls are saved sooner. */
  persistIntervalMs: num(process.env.PERSIST_INTERVAL_MS, 2000),
  /** Put the demo shops and logins in an empty database. Set to false for a real launch. */
  seedDemoData: flag(process.env.SEED_DEMO_DATA, true),
  /** Optional: create this admin account at start-up if the database has no admin yet. */
  bootstrapAdminEmail: text(process.env.ADMIN_EMAIL)?.toLowerCase(),
  bootstrapAdminPassword: text(process.env.ADMIN_PASSWORD),

  // ---- Supabase Storage (photos and documents). Without it, uploads are kept in backend/public/uploads. ----
  supabaseUrl,
  supabaseServiceKey: text(process.env.SUPABASE_SERVICE_ROLE_KEY),
  menuPhotoBucket: process.env.SUPABASE_MENU_BUCKET || "menu-photos",
  shopPhotoBucket: process.env.SUPABASE_SHOP_BUCKET || "shop-photos", // logo and cover (public)
  documentBucket: process.env.SUPABASE_DOCUMENT_BUCKET || "merchant-documents", // SSM / halal certificates (private)
  avatarBucket: process.env.SUPABASE_AVATAR_BUCKET || "avatars", // profile photos (public)
  applicationBucket: process.env.SUPABASE_APPLICATION_BUCKET || "job-applications", // CVs and documents (private)
  /** Biggest photo or document accepted, in MB (phone photos are shrunk by the apps first). */
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 5),

  // ---- email (forgot-password codes). Without SMTP_HOST the code is printed in the server console instead. ----
  smtpHost: text(process.env.SMTP_HOST),
  smtpPort: num(process.env.SMTP_PORT, 587),
  smtpUser: text(process.env.SMTP_USER),
  smtpPass: text(process.env.SMTP_PASS),
  mailFrom: text(process.env.MAIL_FROM) ?? "ScootMeal <no-reply@scootmeal.test>",
  /** Testing only: also return the reset code in the API reply so you can try the flow without email. Never in production. */
  resetCodeInResponse: flag(process.env.RESET_CODE_IN_RESPONSE, false) && process.env.NODE_ENV !== "production",
  resetCodeMinutes: num(process.env.RESET_CODE_MINUTES, 15),

  // ---- AI assistant ----
  openaiApiKey: process.env.OPENAI_API_KEY,
  aiModel: process.env.AI_MODEL ?? "gpt-6-luna",
  /** Speech-to-text model for the assistant's microphone button (POST /api/ai/transcribe). */
  sttModel: text(process.env.STT_MODEL) ?? "gpt-transcribe",
  /**
   * Optional language hints for speech-to-text, comma separated (e.g. "en,zh-cn").
   * Leave empty to detect the language automatically, which also handles mixed English / Malay / Mandarin.
   * OpenAI rejects the whole request if a code is not supported, so only add codes you have tested.
   */
  sttLanguages: (process.env.STT_LANGUAGES ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  /** Longest voice message accepted, in MB. One minute of speech from the app is about 0.5 MB. */
  sttMaxMb: num(process.env.STT_MAX_MB, 5),

  // ---- security ----
  /** How long a login lasts. */
  sessionDays: num(process.env.SESSION_DAYS, 30),
  /** Failed-login / AI-chat rate limit: requests per minute per IP. */
  authRatePerMin: num(process.env.AUTH_RATE_PER_MIN, 30),
  // ---- address search and "address from pin" (OpenStreetMap Nominatim; free, about one request per second) ----
  geoBaseUrl: (text(process.env.GEO_BASE_URL) ?? "https://nominatim.openstreetmap.org").replace(/\/+$/, ""),
  geoUserAgent: text(process.env.GEO_USER_AGENT) ?? "ScootMeal-FYP/1.0 (student project)",
  geoMinGapMs: num(process.env.GEO_MIN_GAP_MS, 1100),
  aiRatePerMin: num(process.env.AI_RATE_PER_MIN, 20),

  // ---- business rules (FR / NFR references in docs/requirements) ----
  // FR-5.5: merchant has 10 minutes to confirm a new order request. Payment only happens after that.
  orderResponseMs: num(process.env.ORDER_RESPONSE_MS, 10 * 60 * 1000),
  // After the restaurant confirms, the customer has this long to pay before the request lapses.
  paymentWindowMs: num(process.env.PAYMENT_WINDOW_MS, 10 * 60 * 1000),
  // In-app calls: how long a call rings before it counts as missed.
  callRingMs: num(process.env.CALL_RING_MS, 30 * 1000),
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
};

export const usingSupabaseStorage = Boolean(env.supabaseUrl && env.supabaseServiceKey);
