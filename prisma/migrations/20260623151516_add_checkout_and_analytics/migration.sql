/*
  Warnings:

  - Added the required column `district` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "district" TEXT;

UPDATE "orders"
SET "district" = 'Dhaka'
WHERE "district" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "district" SET NOT NULL;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "gtmContainerId" TEXT,
ADD COLUMN     "metaPixelId" TEXT,
ALTER COLUMN "nagadEnabled" SET DEFAULT false;
