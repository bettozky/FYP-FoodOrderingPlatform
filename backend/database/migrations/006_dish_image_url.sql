-- Dish photo uploaded by the merchant (public URL in Supabase Storage, bucket "menu-photos").
-- dish.image (emoji) stays as the fallback when there is no photo.
ALTER TABLE dish ADD COLUMN IF NOT EXISTS image_url TEXT;
