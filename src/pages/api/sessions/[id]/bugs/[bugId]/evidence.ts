import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { sessions, bugs, bugEvidence } from '@db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isR2Configured, uploadToR2 } from '@lib/r2';

const UPLOAD_DIR = './uploads';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const session = db.select().from(sessions).where(eq(sessions.id, params.id!)).get();
  if (!session || session.orgId !== user.orgId) return new Response('Not found', { status: 404 });

  const bug = db.select().from(bugs).where(eq(bugs.id, params.bugId!)).get();
  if (!bug || bug.sessionId !== params.id) return new Response('Not found', { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
  if (!allowedTypes.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'File type not allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Limit file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ext = file.name.split('.').pop() || 'png';
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const buffer = Buffer.from(await file.arrayBuffer());
  const evidenceType = file.type.startsWith('video/') ? 'video' : 'screenshot';

  let url: string;

  if (isR2Configured()) {
    const key = `evidence/${params.id}/${params.bugId}/${timestamp}_${sanitizedName}`;
    try {
      url = await uploadToR2(key, buffer, file.type);
    } catch (err: any) {
      console.error('R2 upload failed, falling back to local storage:', err.message);
      // Fall through to local storage
      const fileId = crypto.randomUUID();
      const filename = `${fileId}.${ext}`;
      const dir = join(UPLOAD_DIR, params.bugId!);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, filename), buffer);
      url = `/api/uploads/${params.bugId}/${filename}`;
    }
  } else {
    // Fallback to local uploads
    const fileId = crypto.randomUUID();
    const filename = `${fileId}.${ext}`;
    const dir = join(UPLOAD_DIR, params.bugId!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), buffer);
    url = `/api/uploads/${params.bugId}/${filename}`;
  }

  const evidenceId = crypto.randomUUID();
  db.insert(bugEvidence).values({
    id: evidenceId,
    bugId: params.bugId!,
    type: evidenceType as 'screenshot' | 'video' | 'file',
    url,
    filename: file.name,
    createdAt: new Date(),
  }).run();

  return new Response(JSON.stringify({ id: evidenceId, url, filename: file.name }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
