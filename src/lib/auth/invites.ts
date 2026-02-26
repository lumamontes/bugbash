import { db } from '@db/index';
import { inviteLinks } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

export function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url');
}

export async function createInvite(opts: {
  createdBy: string;
  role: 'participant' | 'facilitator' | 'admin';
  maxUses?: number;
  expiresAt?: Date | null;
}) {
  const id = crypto.randomUUID();
  const code = generateInviteCode();

  await db.insert(inviteLinks).values({
    id,
    code,
    createdBy: opts.createdBy,
    role: opts.role,
    maxUses: opts.maxUses ?? 0,
    timesUsed: 0,
    expiresAt: opts.expiresAt ?? null,
    isActive: true,
    createdAt: new Date(),
  });

  return { id, code };
}

export async function verifyInvite(code: string) {
  const rows = await db.select().from(inviteLinks).where(
    and(
      eq(inviteLinks.code, code),
      eq(inviteLinks.isActive, true),
    )
  );

  const invite = rows[0];
  if (!invite) return null;

  // Check expiry
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return null;
  }

  // Check usage limit (0 = unlimited)
  if (invite.maxUses > 0 && invite.timesUsed >= invite.maxUses) {
    return null;
  }

  return invite;
}

export async function incrementInviteUsage(id: string) {
  const rows = await db.select().from(inviteLinks).where(eq(inviteLinks.id, id));
  const invite = rows[0];
  if (!invite) return;

  await db.update(inviteLinks)
    .set({ timesUsed: invite.timesUsed + 1 })
    .where(eq(inviteLinks.id, id));
}

export async function deactivateInvite(id: string) {
  await db.update(inviteLinks)
    .set({ isActive: false })
    .where(eq(inviteLinks.id, id));
}

export async function listInvites(createdBy?: string) {
  if (createdBy) {
    return await db.select().from(inviteLinks).where(eq(inviteLinks.createdBy, createdBy));
  }
  return await db.select().from(inviteLinks);
}
