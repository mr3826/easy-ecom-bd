-- Catch the migration history up with schema.prisma.
--
-- a5efbae (auth recovery) and 82b8533 (customer address management) added these
-- models to prisma/schema.prisma and were applied to development with
-- `prisma db push`, so no migration ever described them. Production was left
-- nine migrations deep with none of this, which meant the incoming build's
-- Prisma client would name users."emailVerified" in every user read and fail
-- with P2022 ColumnNotFound - a site-wide outage, not a degraded feature.
--
-- Additive only, so it is safe to apply while the previous build is still
-- serving: Prisma lists columns explicitly, so a build that predates these
-- never selects them.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- Constraints are declared inline rather than as separate ALTER TABLE
-- statements: ADD CONSTRAINT has no IF NOT EXISTS, whereas a table that already
-- exists skips the whole CREATE and its constraints with it.
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key"
    ON "password_reset_tokens"("tokenHash");

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_tokenHash_key"
    ON "email_verification_tokens"("tokenHash");

-- The address book's server actions were deleted by the dead-code cleanup, but
-- the model was deliberately kept so the feature can be rebuilt. The table has
-- to exist for the schema and the database to agree.
CREATE TABLE IF NOT EXISTS "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestKey" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "district" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "addresses_userId_idx" ON "addresses"("userId");
CREATE INDEX IF NOT EXISTS "addresses_guestKey_idx" ON "addresses"("guestKey");

-- Finishes what 20260729000000_make_product_brand_optional started. That
-- migration dropped NOT NULL from products."brandId" but left the foreign key
-- on RESTRICT, so deleting a brand that has products still errors instead of
-- clearing the reference the way schema.prisma declares (onDelete: SetNull).
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_brandId_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "brands"("id")
    ON UPDATE CASCADE ON DELETE SET NULL;
