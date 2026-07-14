-- Add product metadata for admin screen refresh
ALTER TABLE "products" ADD COLUMN "metadata" JSONB;
