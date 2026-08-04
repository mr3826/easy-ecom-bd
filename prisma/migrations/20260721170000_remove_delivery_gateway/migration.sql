-- Remove courier delivery-gateway persistence from the active app.
ALTER TABLE IF EXISTS "delivery_shipments" DROP CONSTRAINT IF EXISTS "delivery_shipments_orderId_fkey";

DROP TABLE IF EXISTS "delivery_shipments";
DROP TABLE IF EXISTS "couriers";

ALTER TABLE "orders" DROP COLUMN IF EXISTS "deliveryProvider";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "trackingId";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "consignmentId";

ALTER TABLE "settings" DROP COLUMN IF EXISTS "pathaoEnabled";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "steadfastEnabled";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "redxEnabled";

DROP TYPE IF EXISTS "CourierKey";
