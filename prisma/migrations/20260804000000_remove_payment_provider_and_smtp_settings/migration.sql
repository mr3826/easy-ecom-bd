-- Remove the nagad/rocket payment provider and the database-held SMTP config.
--
-- The twelve settings columns were never written: setting.create omits them,
-- the setting.update data block omits them, the seed omits them, and the admin
-- settings form has no inputs for them. They existed only on their SQL defaults.
-- SMTP configuration now comes from the environment (SMTP_HOST, SMTP_PORT,
-- SMTP_USER, SMTP_PASS, FROM_EMAIL, FROM_NAME) like every other secret here.
--
-- Drop-only. The build that queries these columns must be replaced BEFORE this
-- runs, or every settings read fails with P2022 ColumnNotFound.

ALTER TABLE "settings" DROP COLUMN IF EXISTS "nagadEnabled";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "nagadAccountNumber";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "nagadInstructions";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "rocketEnabled";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "rocketAccountNumber";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "rocketInstructions";

ALTER TABLE "settings" DROP COLUMN IF EXISTS "smtpHost";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "smtpPort";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "smtpUser";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "smtpPass";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "fromEmail";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "fromName";

-- Postgres has no ALTER TYPE ... DROP VALUE, so the enum is rebuilt. The USING
-- casts fail loudly if any row still holds 'nagad' or 'rocket'; with
-- ON_ERROR_STOP that aborts the transaction rather than leaving a partial state.
-- No call site could have produced them: src/lib/domain.ts has always narrowed
-- PaymentProviderKey to "cod" | "bkash".
ALTER TYPE "PaymentProviderKey" RENAME TO "PaymentProviderKey_old";

CREATE TYPE "PaymentProviderKey" AS ENUM ('cod', 'bkash');

ALTER TABLE "orders"
  ALTER COLUMN "paymentProvider" TYPE "PaymentProviderKey"
  USING ("paymentProvider"::text::"PaymentProviderKey");

ALTER TABLE "payments"
  ALTER COLUMN "provider" TYPE "PaymentProviderKey"
  USING ("provider"::text::"PaymentProviderKey");

DROP TYPE "PaymentProviderKey_old";
