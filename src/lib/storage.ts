import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = 'evidence';

export function isStorageConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceRoleKey);
}

function getClient() {
  return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: { persistSession: false },
  });
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const client = getClient();
  const { error } = await client.storage
    .from(BUCKET)
    .upload(key, body, { contentType, upsert: true });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  const { error } = await client.storage.from(BUCKET).remove([key]);

  if (error) {
    throw new Error(`Supabase Storage delete failed: ${error.message}`);
  }
}
