-- Keeps the full answers from the merchant app's 8-step shop sign-up (FR-5.1) for the admin to review:
-- business type, SSM number, landmark, price range, halal, services, allergens, licence no., file names.
-- Fields the app already uses (name, phone, cuisine, prep time, address, hours, menu) also go to their own columns.
ALTER TABLE merchant ADD COLUMN IF NOT EXISTS application JSONB;
