import type { Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/server/db";

type AuditActor = { id?: string | null; email?: string | null };

export async function recordAuditLog(input: {
  actor?: AuditActor | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Prisma.JsonValue | null;
  newValue?: Prisma.JsonValue | null;
  client?: Prisma.TransactionClient;
}) {
  if (!isDatabaseConfigured()) {
    return;
  }
  const prisma = input.client ?? getPrisma();
  await prisma.auditLog.create({
    data: {
      actorId: input.actor?.id,
      actorEmail: input.actor?.email,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
    },
  });
}
