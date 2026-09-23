export type PendingTwoFactorChallengeState = {
  exists: boolean
  userMatches: boolean
  expiresAt: Date | null
  consumedAt: Date | null
  attempts: number
  maxAttempts: number
}

export type PendingTwoFactorDecision =
  | { accepted: true; consume: true; incrementAttempts: false }
  | {
      accepted: false
      consume: boolean
      incrementAttempts: boolean
      reason:
        | "missing"
        | "mismatched"
        | "expired"
        | "reused"
        | "rate_limited"
        | "invalid_code"
    }

export function assessPendingTwoFactorChallenge(
  state: PendingTwoFactorChallengeState,
  codeValid: boolean,
  now = new Date(),
): PendingTwoFactorDecision {
  if (!state.exists) {
    return { accepted: false, consume: false, incrementAttempts: false, reason: "missing" }
  }
  if (!state.userMatches) {
    return { accepted: false, consume: true, incrementAttempts: false, reason: "mismatched" }
  }
  if (state.consumedAt) {
    return { accepted: false, consume: false, incrementAttempts: false, reason: "reused" }
  }
  if (!state.expiresAt || state.expiresAt <= now) {
    return { accepted: false, consume: true, incrementAttempts: false, reason: "expired" }
  }
  if (state.attempts >= state.maxAttempts) {
    return { accepted: false, consume: true, incrementAttempts: false, reason: "rate_limited" }
  }
  if (!codeValid) {
    const exhausted = state.attempts + 1 >= state.maxAttempts
    return {
      accepted: false,
      consume: exhausted,
      incrementAttempts: true,
      reason: exhausted ? "rate_limited" : "invalid_code",
    }
  }
  return { accepted: true, consume: true, incrementAttempts: false }
}
