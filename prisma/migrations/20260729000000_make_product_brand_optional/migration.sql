-- Brand becomes optional on products.
-- Dropping NOT NULL is non-destructive: every existing row keeps its brandId,
-- and the foreign key still rejects any id that does not exist. Only the
-- "must have one" rule goes away.
ALTER TABLE "products" ALTER COLUMN "brandId" DROP NOT NULL;
