export const LEGACY_STAFF_ROLES = [
  "investigator",
  "analyst",
] as const

export const PERMANENT_ROLES = [
  "client",
  "staff",
  "administrator",
  "super_administrator",
] as const

export const LEGACY_ROLE_ALIASES = [
  "investigator",
  "analyst",
  "super-administrator",
] as const

export const CASE_ASSIGNMENT_FUNCTIONS = [
  "lead_investigator",
  "investigator",
  "analyst",
  "reviewer",
] as const

export const TRAINING_ASSIGNMENT_FUNCTIONS = [
  "lead_trainer",
  "trainer",
  "assistant_trainer",
  "coordinator",
] as const

export type PermanentRole =
  | (typeof PERMANENT_ROLES)[number]
  | (typeof LEGACY_ROLE_ALIASES)[number]

export type NormalizedPermanentRole =
  (typeof PERMANENT_ROLES)[number]

export type CaseAssignmentFunction =
  (typeof CASE_ASSIGNMENT_FUNCTIONS)[number]

export type TrainingAssignmentFunction =
  (typeof TRAINING_ASSIGNMENT_FUNCTIONS)[number]

export function normalizePermanentRole(
  role: string | null | undefined,
): NormalizedPermanentRole | null {
  if (role === "investigator" || role === "analyst") {
    return "staff"
  }

  if (role === "super-administrator") {
    return "super_administrator"
  }

  if (
    role === "client" ||
    role === "staff" ||
    role === "administrator" ||
    role === "super_administrator"
  ) {
    return role
  }

  return null
}

export function isLegacyStaffRole(
  role: string | null | undefined,
): boolean {
  return role === "investigator" || role === "analyst"
}

export function isStaffLikeRole(
  role: string | null | undefined,
): boolean {
  return normalizePermanentRole(role) === "staff"
}

export function isAdministratorRole(
  role: string | null | undefined,
): boolean {
  return normalizePermanentRole(role) === "administrator"
}

export function isSuperAdministratorRole(
  role: string | null | undefined,
): boolean {
  return normalizePermanentRole(role) === "super_administrator"
}

export function isAdminLikeRole(
  role: string | null | undefined,
): boolean {
  const normalized = normalizePermanentRole(role)
  return (
    normalized === "administrator" ||
    normalized === "super_administrator"
  )
}

export function isAssignablePermanentRole(
  role: string | null | undefined,
): boolean {
  const normalized = normalizePermanentRole(role)
  return (
    normalized === "staff" ||
    normalized === "administrator" ||
    normalized === "super_administrator"
  )
}

export function isCaseAssignmentFunction(
  value: string | null | undefined,
): value is CaseAssignmentFunction {
  return CASE_ASSIGNMENT_FUNCTIONS.includes(
    value as CaseAssignmentFunction,
  )
}

export function normalizeCaseAssignmentFunction(
  value: string | null | undefined,
): CaseAssignmentFunction | null {
  if (value === "administrator" || value === "super_administrator") {
    return "reviewer"
  }

  return isCaseAssignmentFunction(value) ? value : null
}

export function canCaseFunctionMessage(
  value: string | null | undefined,
): boolean {
  const fn = normalizeCaseAssignmentFunction(value)
  return (
    fn === "lead_investigator" ||
    fn === "investigator" ||
    fn === "analyst"
  )
}

export function canCaseFunctionInvestigate(
  value: string | null | undefined,
): boolean {
  return canCaseFunctionMessage(value)
}

export function canCaseFunctionReview(
  value: string | null | undefined,
): boolean {
  return normalizeCaseAssignmentFunction(value) !== null
}

export function isTrainingAssignmentFunction(
  value: string | null | undefined,
): value is TrainingAssignmentFunction {
  return TRAINING_ASSIGNMENT_FUNCTIONS.includes(
    value as TrainingAssignmentFunction,
  )
}

export function canTrainingFunctionComplete(
  value: string | null | undefined,
): boolean {
  return value === "lead_trainer" || value === "trainer"
}

export function canTrainingFunctionManagePlan(
  value: string | null | undefined,
): boolean {
  return value === "lead_trainer"
}

export function canTrainingFunctionCoordinate(
  value: string | null | undefined,
): boolean {
  return (
    value === "lead_trainer" ||
    value === "trainer" ||
    value === "assistant_trainer" ||
    value === "coordinator"
  )
}
