import { validateUsername } from "@/lib/auth";

export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_BUCKET = "profile-images";
export const PROFILE_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateProfileInput(input: {
  username: unknown;
  displayName: unknown;
}) {
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";

  if (!validateUsername(username)) {
    return { valid: false as const, error: "Username must be 4-30 characters using only letters, numbers, underscores or hyphens." };
  }
  if (!displayName || displayName.length > 100) {
    return { valid: false as const, error: "Display name must be between 1 and 100 characters." };
  }

  return { valid: true as const, username, displayName };
}

export function profileImagePath(userId: string) {
  return `${userId}/avatar.webp`;
}

export function validateProfileImage(file: { size: number; type: string }) {
  if (file.size <= 0 || file.size > PROFILE_IMAGE_MAX_BYTES) {
    return "Choose an image no larger than 2 MB.";
  }
  if (!PROFILE_IMAGE_CONTENT_TYPES.has(file.type)) {
    return "Choose a JPEG, PNG or WebP image.";
  }
  return null;
}
