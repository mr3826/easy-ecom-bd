-- Extend provider enums used by payments and couriers.
ALTER TYPE "PaymentProviderKey" ADD VALUE IF NOT EXISTS 'cod';
ALTER TYPE "PaymentProviderKey" ADD VALUE IF NOT EXISTS 'rocket';

ALTER TYPE "CourierKey" ADD VALUE IF NOT EXISTS 'redx';

-- Create operational order lifecycle and delivery-zone enums.
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'pending', 'confirmed', 'cancelled', 'delivered');
CREATE TYPE "DeliveryZone" AS ENUM ('inside_dhaka', 'sub_dhaka', 'outside_dhaka');

-- Product admin/search metadata.
ALTER TABLE "products"
ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "searchKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Order lifecycle and fulfillment metadata.
ALTER TABLE "orders"
ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN "deliveryZone" "DeliveryZone" NOT NULL DEFAULT 'inside_dhaka',
ADD COLUMN "deliveryProvider" "CourierKey",
ADD COLUMN "trackingId" TEXT,
ADD COLUMN "consignmentId" TEXT,
ADD COLUMN "adminNotes" TEXT;

CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_status_history"
ADD CONSTRAINT "order_status_history_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business, payment, and delivery settings.
ALTER TABLE "settings"
ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN "businessHours" TEXT NOT NULL DEFAULT '',
ADD COLUMN "deliveryAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "returnRefundPolicy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "confirmationMessageTemplate" TEXT NOT NULL DEFAULT '',
ADD COLUMN "codEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "bkashAccountNumber" TEXT,
ADD COLUMN "bkashInstructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN "nagadAccountNumber" TEXT,
ADD COLUMN "nagadInstructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN "rocketEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rocketAccountNumber" TEXT,
ADD COLUMN "rocketInstructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN "insideDhakaDeliveryCharge" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN "subDhakaDeliveryCharge" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "outsideDhakaDeliveryCharge" INTEGER NOT NULL DEFAULT 130,
ADD COLUMN "insideDhakaCodEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "subDhakaCodEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "outsideDhakaCodEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "redxEnabled" BOOLEAN NOT NULL DEFAULT false;
