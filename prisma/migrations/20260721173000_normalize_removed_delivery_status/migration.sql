UPDATE "orders"
SET "deliveryStatus" = 'in_transit'
WHERE "deliveryStatus" = 'courier_created';
