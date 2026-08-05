-- Closes the drift between prisma/migrations and prisma/schema.prisma that the
-- new CI gate caught on a clean database. Three items, none of which any
-- earlier migration expressed:
--
-- 1. 20260721173000_normalize_removed_delivery_status moved every row off
--    'courier_created' but never altered the enum type, so the value stayed
--    legal in the database while schema.prisma no longer listed it. Postgres
--    cannot drop a value from an enum in place; the recreate-and-swap below is
--    what Prisma itself generates. Safe because no row can hold the value: the
--    2026-07-21 migration normalised the existing ones and the TypeScript
--    DeliveryStatus union has not included it since.
--
-- 2/3. Older Prisma versions emitted DEFAULT ARRAY[]::text[] for scalar list
--    columns; Prisma 7 does not. The columns stay NOT NULL and the client
--    always sends a value, so dropping the defaults changes no application
--    behaviour — it only makes the database match the schema that describes it.

-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryStatus_new" AS ENUM ('pending', 'picked_up', 'in_transit', 'delivered', 'returned', 'cancelled');
ALTER TABLE "public"."orders" ALTER COLUMN "deliveryStatus" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "deliveryStatus" TYPE "DeliveryStatus_new" USING ("deliveryStatus"::text::"DeliveryStatus_new");
ALTER TYPE "DeliveryStatus" RENAME TO "DeliveryStatus_old";
ALTER TYPE "DeliveryStatus_new" RENAME TO "DeliveryStatus";
DROP TYPE "public"."DeliveryStatus_old";
ALTER TABLE "orders" ALTER COLUMN "deliveryStatus" SET DEFAULT 'pending';
COMMIT;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "searchKeywords" DROP DEFAULT;

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "deliveryAreas" DROP DEFAULT;
