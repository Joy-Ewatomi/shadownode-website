export async function sendVerificationEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !appUrl) return false;
  const verificationUrl = `${appUrl.replace(/\/$/, "")}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Verify your ShadowNode account", html: `<p>Verify your account by clicking <a href="${verificationUrl}">this secure link</a>. It expires in 24 hours.</p>` }),
  });
  if (!response.ok) throw new Error("Verification email could not be sent");
  return true;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !appUrl) return false;
  const resetUrl = `${appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Reset your ShadowNode password", html: `<p>Reset your password by opening <a href="${resetUrl}">this secure link</a>. It expires in 15 minutes.</p>` }),
  });
  if (!response.ok) throw new Error("Password reset email could not be sent");
  return true;
}
