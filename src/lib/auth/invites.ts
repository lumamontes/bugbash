import { db } from '@db/index';
import { inviteLinks } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

export function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url');
}

export function createInvite(opts: {
  createdBy: string;
  role: 'participant' | 'facilitator' | 'admin';
  maxUses?: number;
  expiresAt?: Date | null;
}) {
  const id = crypto.randomUUID();
  const code = generateInviteCode();

  db.insert(inviteLinks).values({
    id,
    code,
    createdBy: opts.createdBy,
    role: opts.role,
    maxUses: opts.maxUses ?? 0,
    timesUsed: 0,
    expiresAt: opts.expiresAt ?? null,
    isActive: true,
    createdAt: new Date(),
  }).run();

  return { id, code };
}

export function verifyInvite(code: string) {
  const invite = db.select().from(inviteLinks).where(
    and(
      eq(inviteLinks.code, code),
      eq(inviteLinks.isActive, true),
    )
  ).get();

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

export function incrementInviteUsage(id: string) {
  const invite = db.select().from(inviteLinks).where(eq(inviteLinks.id, id)).get();
  if (!invite) return;

  db.update(inviteLinks)
    .set({ timesUsed: invite.timesUsed + 1 })
    .where(eq(inviteLinks.id, id))
    .run();
}

export function deactivateInvite(id: string) {
  db.update(inviteLinks)
    .set({ isActive: false })
    .where(eq(inviteLinks.id, id))
    .run();
}

export function listInvites(createdBy?: string) {
  if (createdBy) {
    return db.select().from(inviteLinks).where(eq(inviteLinks.createdBy, createdBy)).all();
  }
  return db.select().from(inviteLinks).all();
}
