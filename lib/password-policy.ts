export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export type PasswordRequirementId =
  | "minimumLength"
  | "maximumLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "specialCharacter"

export type PasswordPolicyResult = {
  valid: boolean
  checks: Record<PasswordRequirementId, boolean>
  message: string | null
}

export const PASSWORD_REQUIREMENTS: ReadonlyArray<{
  id: PasswordRequirementId
  label: string
}> = [
  { id: "minimumLength", label: `At least ${PASSWORD_MIN_LENGTH} characters` },
  { id: "maximumLength", label: `No more than ${PASSWORD_MAX_LENGTH} characters` },
  { id: "uppercase", label: "At least one uppercase letter" },
  { id: "lowercase", label: "At least one lowercase letter" },
  { id: "number", label: "At least one number" },
  { id: "specialCharacter", label: "At least one special character" },
]

export function evaluatePassword(password: string): PasswordPolicyResult {
  const checks: PasswordPolicyResult["checks"] = {
    minimumLength: password.length >= PASSWORD_MIN_LENGTH,
    maximumLength: password.length <= PASSWORD_MAX_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialCharacter: /[^A-Za-z0-9]/.test(password),
  }
  const messages: Record<PasswordRequirementId, string> = {
    minimumLength: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    maximumLength: `Password must be no more than ${PASSWORD_MAX_LENGTH} characters.`,
    uppercase: "Password must include at least one uppercase letter.",
    lowercase: "Password must include at least one lowercase letter.",
    number: "Password must include at least one number.",
    specialCharacter: "Password must include at least one special character.",
  }
  const failed = PASSWORD_REQUIREMENTS.find((requirement) => !checks[requirement.id])
  return { valid: !failed, checks, message: failed ? messages[failed.id] : null }
}

export function validatePassword(password: string) {
  return evaluatePassword(password).valid
}


export function readNewPasswordFormValues(formData: Pick<FormData, "get">) {
  return {
    password: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmNewPassword") ?? ""),
  }
}


export function readChangePasswordFormValues(formData: Pick<FormData, "get">) {
  return {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  }
}
