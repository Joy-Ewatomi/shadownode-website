import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auditLog, getCurrentUser } from "@/lib/auth";
import {
  PROFILE_IMAGE_BUCKET,
  profileImagePath,
  validateProfileImage,
} from "@/lib/profile-settings";
import { isSameOriginMutation } from "@/lib/security-center";
import {
  createSignedUrlForBucket,
  deleteFileFromBucket,
  uploadFileToBucket,
} from "@/lib/services/storage-service";

const NO_STORE = { "Cache-Control": "private, no-store" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  try {
    const signedUrl = await createSignedUrlForBucket(PROFILE_IMAGE_BUCKET, profileImagePath(user.id), 300);
    return NextResponse.redirect(signedUrl, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Profile image not found." }, { status: 404, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });

  const form = await request.formData().catch(() => null);
  const image = form?.get("avatar");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Choose a profile image." }, { status: 400, headers: NO_STORE });
  }
  const validationError = validateProfileImage(image);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400, headers: NO_STORE });
  }

  try {
    const normalized = await sharp(Buffer.from(await image.arrayBuffer()), { limitInputPixels: 16_000_000 })
      .rotate()
      .resize(512, 512, { fit: "cover", position: "attention" })
      .webp({ quality: 84 })
      .toBuffer();
    await uploadFileToBucket(
      PROFILE_IMAGE_BUCKET,
      profileImagePath(user.id),
      normalized,
      "image/webp",
      { upsert: true },
    );
    await auditLog(user.id, "account_profile_image_updated", request);
    return NextResponse.json({ message: "Profile picture updated." }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Profile picture could not be processed or stored." }, { status: 500, headers: NO_STORE });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  try {
    await deleteFileFromBucket(PROFILE_IMAGE_BUCKET, profileImagePath(user.id));
    await auditLog(user.id, "account_profile_image_removed", request);
    return NextResponse.json({ message: "Profile picture removed." }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Profile picture could not be removed." }, { status: 500, headers: NO_STORE });
  }
}
