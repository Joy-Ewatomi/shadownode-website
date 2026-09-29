export type VerifiedPaymentRedirectResult = {
  success: boolean;
  status?: string;
  request_id?: string;
  case_id?: string;
  training_engagement_id?: string;
};

function segment(value: string) {
  return encodeURIComponent(value);
}

export function paymentStatusDestination(
  result: VerifiedPaymentRedirectResult,
  fallbackRequestId?: string | null,
) {
  const requestId = result.request_id || fallbackRequestId || undefined;
  const paymentDestination = requestId
    ? `/dashboard/client/payments/${segment(requestId)}`
    : "/dashboard/client/payments";

  if (!result.success || result.status !== "paid") {
    return paymentDestination;
  }

  if (result.training_engagement_id) {
    return `/dashboard/training/${segment(result.training_engagement_id)}`;
  }

  if (result.case_id) {
    return `/dashboard/client/cases/${segment(result.case_id)}`;
  }

  return paymentDestination;
}
