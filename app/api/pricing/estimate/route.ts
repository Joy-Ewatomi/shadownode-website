
import {
  estimatePrice,
  type PricingFactors,
  type ServiceType,
  type Timeline,
  type TrainingDelivery,
} from "@/lib/pricing"

/* ============================================================
   HELPERS
============================================================ */

function isServiceType(
  value: unknown,
): value is ServiceType {
  return (
    value === "osint" ||
    value === "forensics" ||
    value === "ethical-hacking" ||
    value === "cybersecurity-training" ||
    value === "mixed"
  )
}

function isTimeline(
  value: unknown,
): value is Timeline {
  return (
    value === "urgent" ||
    value === "standard" ||
    value === "flexible"
  )
}

/**
 * Convert anything reasonably numeric into a number.
 *
 * Handles:
 *   3
 *   "3"
 *   "3 hours"
 *   "3_hours"
 *   "3.5"
 */
function parseNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null
  }

  if (typeof value !== "string") {
    return null
  }

  const normalized = value
    .trim()
    .replace(/,/g, "")

  const match =
    normalized.match(
      /-?\d+(?:\.\d+)?/,
    )

  if (!match) {
    return null
  }

  const number =
    Number(match[0])

  return Number.isFinite(number)
    ? number
    : null
}

/**
 * Parse a duration value into weeks.
 *
 * Supported examples:
 *
 *   13
 *   "13"
 *   "13 weeks"
 *   "13_weeks"
 *   "13-week"
 *   "3 months"
 *   "3_months"
 *   "1 month"
 *   "2 years"
 *
 * For months and years we use approximate
 * calendar-to-week conversions for estimation.
 */
function parseTrainingDurationWeeks(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  const text =
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")

  const numberMatch =
    text.match(
      /(\d+(?:\.\d+)?)/,
    )

  if (!numberMatch) {
    return null
  }

  const amount =
    Number(numberMatch[1])

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null
  }

  if (
    text.includes("year")
  ) {
    return Number(
      (amount * 52).toFixed(2),
    )
  }

  if (
    text.includes("month")
  ) {
    return Number(
      (amount * 4.345).toFixed(2),
    )
  }

  if (
    text.includes("day")
  ) {
    return Number(
      (amount / 7).toFixed(2),
    )
  }

  /**
   * If no unit was supplied, assume the
   * form value is already in weeks.
   */
  return amount
}

/**
 * Convert common delivery/format values from the
 * training form into the values understood by pricing.ts.
 */
function normalizeTrainingDelivery(
  value: unknown,
): TrainingDelivery | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_")

  const aliases: Record<
    string,
    TrainingDelivery
  > = {
    one_on_one: "one_on_one",
    one_to_one: "one_on_one",
    one2one: "one_on_one",
    private: "one_on_one",
    individual: "one_on_one",
    personalized: "one_on_one",

    small_group: "small_group",
    smallgroup: "small_group",

    group: "group",
    group_training: "group",
    classroom: "group",

    corporate: "corporate",
    corporate_training: "corporate",
    organization: "corporate",
    organisation: "corporate",
  }

  return (
    aliases[normalized] ||
    null
  )
}

/**
 * Safely convert a value into a boolean.
 *
 * Handles:
 *   true / false
 *   "true" / "false"
 *   "yes" / "no"
 *   "1" / "0"
 */
function parseBoolean(
  value: unknown,
): boolean {
  if (
    value === true ||
    value === 1
  ) {
    return true
  }

  if (
    value === false ||
    value === 0 ||
    value === null ||
    value === undefined
  ) {
    return false
  }

  if (typeof value === "string") {
    const normalized =
      value
        .trim()
        .toLowerCase()

    return (
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "1" ||
      normalized === "on" ||
      normalized === "required"
    )
  }

  return false
}

/**
 * Extract the first non-empty value from
 * several possible field names.
 *
 * This makes the API tolerant of small naming
 * differences between form components.
 */
function firstValue(
  ...values: unknown[]
): unknown {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value
    }
  }

  return null
}

/**
 * Build a useful description when the client
 * sends structured training data but no single
 * description field.
 */
function buildTrainingDescription(
  body: Record<string, unknown>,
): string {
  const parts: string[] = []

  const audience =
    firstValue(
      body.training_audience,
      body.custom_training_audience,
    )

  const objective =
    firstValue(
      body.training_objective,
      body.custom_training_objective,
    )

  const goal =
    body.training_goal

  const industry =
    firstValue(
      body.training_industry,
      body.custom_industry,
    )

  const topics =
    Array.isArray(
      body.training_topics_selected,
    )
      ? body.training_topics_selected
          .filter(
            (item) =>
              typeof item === "string",
          )
          .join(", ")
      : ""

  const outcomes =
    Array.isArray(
      body.training_expected_outcome,
    )
      ? body.training_expected_outcome
          .filter(
            (item) =>
              typeof item === "string",
          )
          .join(", ")
      : ""

  if (audience) {
    parts.push(
      `Audience: ${String(audience)}`,
    )
  }

  if (goal) {
    parts.push(
      `Training goal: ${String(goal)}`,
    )
  }

  if (objective) {
    parts.push(
      `Objective: ${String(objective)}`,
    )
  }

  if (industry) {
    parts.push(
      `Industry: ${String(industry)}`,
    )
  }

  if (topics) {
    parts.push(
      `Topics: ${topics}`,
    )
  }

  if (outcomes) {
    parts.push(
      `Expected outcomes: ${outcomes}`,
    )
  }

  const customDescription =
    body.custom_description

  if (
    customDescription &&
    String(customDescription).trim()
  ) {
    parts.push(
      String(customDescription).trim(),
    )
  }

  return parts.join(" | ")
}

/* ============================================================
   POST
============================================================ */

export async function POST(
  request: Request,
) {
  try {
    /* ========================================================
       PARSE REQUEST
    ======================================================== */

    let body: Record<
      string,
      unknown
    >

    try {
      body =
        (await request.json()) as Record<
          string,
          unknown
        >
    } catch {
      return Response.json(
        {
          error:
            "Invalid JSON request body",
        },
        {
          status: 400,
        },
      )
    }

    /* ========================================================
       BASIC INPUT
    ======================================================== */

    const serviceType =
      body.serviceType

    const rawDescription =
      body.description

    const timeline =
      body.timeline

    if (
      !serviceType ||
      !isServiceType(serviceType)
    ) {
      return Response.json(
        {
          error:
            "Invalid or missing serviceType",
        },
        {
          status: 400,
        },
      )
    }

    /**
     * Training forms may not have a traditional
     * investigation description, so construct one
     * from their structured fields when necessary.
     */
    const description =
      typeof rawDescription ===
      "string"
        ? rawDescription.trim()
        : serviceType ===
            "cybersecurity-training"
          ? buildTrainingDescription(
              body,
            ).trim()
          : ""

    if (
      description.length < 20
    ) {
      return Response.json(
        {
          error:
            "Description must be at least 20 characters",
        },
        {
          status: 400,
        },
      )
    }

    /**
     * Timeline is required by the pricing
     * engine. Training requests can default
     * to standard when the form does not expose
     * an explicit urgency selector.
     */
    const normalizedTimeline: Timeline =
      isTimeline(timeline)
        ? timeline
        : "standard"

    /* ========================================================
       TRAINING FACTORS
    ======================================================== */

    if (
      serviceType ===
      "cybersecurity-training"
    ) {
      const trainingDurationWeeks =
        parseTrainingDurationWeeks(
          firstValue(
            body.trainingDurationWeeks,
            body.training_duration_weeks,
            body.training_duration,
          ),
        )

      const sessionsPerWeek =
        parseNumber(
          firstValue(
            body.sessionsPerWeek,
            body.sessions_per_week,
            body.custom_sessions_per_week,
          ),
        )

      const sessionDurationHours =
        parseNumber(
          firstValue(
            body.sessionDurationHours,
            body.session_duration_hours,
            body.custom_hours_per_session,
          ),
        )

      const trainingDelivery =
        normalizeTrainingDelivery(
          firstValue(
            body.trainingDelivery,
            body.training_delivery,
            body.training_format,
          ),
        )

      /**
       * Training components.
       *
       * The pricing engine only applies these
       * when explicitly enabled.
       */

      const practicalLabs =
        parseBoolean(
          firstValue(
            body.practicalLabs,
            body.practical_labs,
            body.training_labs_required,
          ),
        )

      const assignments =
        parseBoolean(
          firstValue(
            body.assignments,
            body.training_assignments,
          ),
        )

      /**
       * If training materials contains selected
       * materials, treat the feature as enabled.
       */
      const materials =
        Array.isArray(
          body.training_materials,
        )
          ? body.training_materials.length >
            0
          : parseBoolean(
              firstValue(
                body.materials,
                body.training_materials,
              ),
            )

      /**
       * Chat support can be explicitly supplied.
       *
       * We intentionally do NOT assume it is
       * included merely because the client uses
       * the portal.
       */
      const chatSupport =
        parseBoolean(
          firstValue(
            body.chatSupport,
            body.chat_support,
            body.training_chat_support,
          ),
        )

      const assessment =
        parseBoolean(
          firstValue(
            body.assessment,
            body.training_assessment_required,
          ),
        )

      const certification =
        parseBoolean(
          firstValue(
            body.certification,
            body.training_certificate,
          ),
        )

      const careerGuidance =
        parseBoolean(
          firstValue(
            body.careerGuidance,
            body.career_guidance,
            body.training_career_guidance,
          ),
        )

      /**
       * Specialization can be supplied as a
       * string or inferred from selected topics.
       *
       * The pricing engine treats a non-empty
       * specialization as enabled.
       */
      const specializationValue =
        firstValue(
          body.specialization,
          body.training_specialization,
          body.training_skill_level,
          body.training_topics_selected,
        )

      const specialization =
        Array.isArray(
          specializationValue,
        )
          ? specializationValue.join(
              ", ",
            )
          : specializationValue
            ? String(
                specializationValue,
              )
            : null

      /* ======================================================
         BUILD TRAINING PRICING FACTORS
      ====================================================== */

      const pricingFactors: PricingFactors =
        {
          serviceType,
          description,
          timeline:
            normalizedTimeline,

          /**
           * These investigation fields are
           * intentionally not used by the
           * training engine.
           */
          investigationDepth: null,
          confidentialityLevel: null,
          subjectType: null,

          trainingDurationWeeks,
          sessionsPerWeek,
          sessionDurationHours,
          trainingDelivery,

          specialization,

          practicalLabs,
          assignments,
          materials,
          chatSupport,
          assessment,
          certification,
          careerGuidance,
        }

      const estimate =
        estimatePrice(
          pricingFactors,
        )

      return Response.json(
        {
          ...estimate,

          /**
           * Explicitly identify that this was
           * calculated using the training model.
           */
          serviceType,
          pricingModel: "training",

          /**
           * Return normalized training inputs
           * so the frontend/admin can see exactly
           * what the engine priced.
           */
          trainingInputs: {
            trainingDurationWeeks,
            sessionsPerWeek,
            sessionDurationHours,
            trainingDelivery,
            specialization,
            practicalLabs,
            assignments,
            materials,
            chatSupport,
            assessment,
            certification,
            careerGuidance,
          },
        },
        {
          status: 200,
        },
      )
    }

    /* ========================================================
       INVESTIGATION FACTORS
    ======================================================== */

    const investigationDepth =
      body.investigationDepth ??
      body.investigation_depth ??
      null

    const confidentialityLevel =
      body.confidentialityLevel ??
      body.confidentiality_level ??
      null

    const subjectType =
      body.subjectType ??
      body.subject_type ??
      null

    const pricingFactors: PricingFactors =
      {
        serviceType,
        description,
        timeline:
          normalizedTimeline,

        investigationDepth:
          typeof investigationDepth ===
          "string"
            ? investigationDepth
            : null,

        confidentialityLevel:
          typeof confidentialityLevel ===
          "string"
            ? confidentialityLevel
            : null,

        subjectType:
          typeof subjectType ===
          "string"
            ? subjectType
            : null,
      }

    /* ========================================================
       ESTIMATE
    ======================================================== */

    const estimate =
      estimatePrice(
        pricingFactors,
      )

    return Response.json(
      {
        ...estimate,

        serviceType,

        pricingModel:
          "investigation",
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "Pricing estimation error:",
      error,
    )

    return Response.json(
      {
        error:
          "Failed to estimate price",
      },
      {
        status: 500,
      },
    )
  }
}