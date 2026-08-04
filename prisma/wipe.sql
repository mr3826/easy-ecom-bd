-- The single definition of "wipe this database".
--
-- Read by `npm run db:reset` locally and fed to psql on the cPanel host by
-- scripts/wipe-production-db.ps1, so the two paths cannot drift apart.
--
-- The table list comes from the catalogue instead of being written out here, so
-- adding a Prisma model needs no edit and there is no delete-ordering to keep
-- correct. CASCADE settles the foreign keys; _prisma_migrations is left alone so
-- the schema stays migrated and `prisma migrate` does not try to replay history.
DO $$
DECLARE
  targets text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO targets
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename <> '_prisma_migrations';

  IF targets IS NULL THEN
    RAISE NOTICE 'No application tables found; nothing to wipe.';
  ELSE
    EXECUTE 'TRUNCATE TABLE ' || targets || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;
