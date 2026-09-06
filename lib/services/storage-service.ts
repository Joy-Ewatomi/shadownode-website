import { createClient } from "@supabase/supabase-js"

const storage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function uploadEvidenceFile(
  path: string,
  buffer: Buffer,
  contentType: string
) {
  const { error } = await storage.storage
    .from("evidence")
    .upload(path, buffer, {
      contentType,
      upsert: false,
    })

  if (error) {
    throw error
  }

  return path
}

export async function deleteEvidenceFile(
  path: string
) {
  await storage.storage
    .from("evidence")
    .remove([path])
}

export async function createSignedEvidenceUrl(
  path: string
) {
  const { data, error } = await storage.storage
    .from("evidence")
    .createSignedUrl(path, 60 * 15)

  if (error) {
    throw error
  }

  return data.signedUrl
}

// Generic upload helper that can be used by server-side code for other buckets
export async function uploadFileToBucket(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
  options?: { upsert?: boolean }
) {
  const { error } = await storage.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: options?.upsert || false,
    })

  if (error) {
    throw error
  }

  return path
}

export async function createSignedUrlForBucket(bucket: string, path: string, expiresSec = 60 * 15) {
  const { data, error } = await storage.storage
    .from(bucket)
    .createSignedUrl(path, expiresSec)

  if (error) {
    throw error
  }

  return data.signedUrl
}