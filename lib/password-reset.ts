export type PasswordResetRecord = {
  expires_at: string
  used_at: string | null
}

export function isUsablePasswordReset(
  reset: PasswordResetRecord | null | undefined,
  now = new Date(),
) {
  if (!reset || reset.used_at) return false
  const expiresAt = new Date(reset.expires_at)
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now
}
