import type { APIRoute } from 'astro';
import { db } from '@db/index';
import { bugEvidence } from '@db/schema';
import { requireSessionContext } from '@lib/services/helpers';
import { getBugInSession } from '@lib/services/bugs';
import crypto from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isStorageConfigured, uploadFile } from '@lib/storage';

const UPLOAD_DIR = './uploads';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const ctx = await requireSessionContext(locals, params.id!);
  if (ctx.error) return ctx.error;

  const bug = await getBugInSession(params.bugId!, params.id!);
  if (!bug) return new Response('Not found', { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
  if (!allowedTypes.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'File type not allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  if (isStorageConfigured()) {
    const key = `evidence/${params.id}/${params.bugId}/${timestamp}_${sanitizedName}`;
    try {
      url = await uploadFile(key, buffer, file.type);
    } catch (err: any) {
      console.error('Supabase Storage upload failed:', err.message);
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    const fileId = crypto.randomUUID();
    const filename = `${fileId}.${ext}`;
    const dir = join(UPLOAD_DIR, params.bugId!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), buffer);
    url = `/api/uploads/${params.bugId}/${filename}`;
  }

  const evidenceId = crypto.randomUUID();
  await db.insert(bugEvidence).values({
    id: evidenceId,
    bugId: params.bugId!,
    type: evidenceType as 'screenshot' | 'video' | 'file',
    url,
    filename: file.name,
    createdAt: new Date(),
  });

  return new Response(JSON.stringify({ id: evidenceId, url, filename: file.name }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
