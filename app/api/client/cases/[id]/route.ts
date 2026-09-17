import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

type ClientCaseRow = {
  id: string
  case_number: string
  title: string
  status: string | null
  priority: string | null
  created_at: string
  progress: number | null
}

type ClientRequestRow = {
  id: string

  client_email: string | null
  contact_method: string | null
  is_anonymous: boolean | null

  service_type: string | null
  title: string | null
  description: string | null
  investigation_objective: string | null

  priority: string | null
  currency: string | null
  preferred_currency: string | null

  subject_type: string | null
  subject_full_name: string | null
  subject_known_usernames: string | null
  subject_emails: string | null
  subject_phone_numbers: string | null
  subject_location: string | null
  subject_organization: string | null
  subject_websites: string | null

  subject_company_name: string | null
  subject_company_website: string | null
  subject_company_country: string | null
  subject_company_industry: string | null

  subject_domain: string | null
  subject_url: string | null
  subject_ip_address: string | null
  subject_platform: string | null

  subject_approximate_age: string | null
  subject_height: string | null
  subject_weight: string | null
  subject_hair_color: string | null
  subject_eye_color: string | null
  subject_skin_tone: string | null
  subject_distinguishing_marks: string | null
  subject_nationality: string | null
  subject_languages_spoken: string | null

  subject_last_known_address: string | null
  subject_last_known_occupation: string | null

  subject_additional_usernames: string | null
  subject_gaming_ids: string | null
  subject_cryptocurrency_wallets: string | null
  subject_domain_names: string | null
  subject_ip_addresses: string | null
  subject_vehicle_registration: string | null

  existing_information: string | null
  investigation_depth: string | null
  confidentiality_level: string | null
  authorization_confirmed: boolean | null

  communication_method: string | null
  communication_email: string | null
  communication_country_code: string | null
  communication_phone: string | null
  communication_whatsapp: string | null
  communication_signal: string | null

  client_country: string | null
  timeline: string | null
  additional_notes: string | null

  supporting_links: unknown
  evidence_uploads: unknown
}

type ClientTimelineRow = {
  id: string
  update_type: string | null
  title: string | null
  content: string | null
  created_at: string
}

type ClientReportRow = {
  id: string
  title: string | null
  file_url: string | null
  summary: string | null
  created_at: string
}

type ClientMessageRow = {
  id: string
  conversation_id: string
  case_id: string
  sender_id: string
  sender_username: string | null
  sender_role: string | null
  message: string
  created_at: string
  read_at: string | null
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  },
) {
  try {
    // ==========================================================
    // AUTHENTICATION
    // ==========================================================

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error: "Case ID is required",
        },
        {
          status: 400,
        },
      )
    }

    // ==========================================================
    // RESOLVE APP USER -> USER PROFILE
    //
    // app_users.id is the authenticated user ID.
    // cases.client_profile_id / case_user_id point to
    // user_profiles.id.
    // ==========================================================

    const profileResult =
      await query<{ id: string }>(
        `
          SELECT id
          FROM user_profiles
          WHERE user_id = $1
          LIMIT 1
        `,
        [user.id],
      )

    const profileId =
      profileResult.rows[0]?.id ?? null

    if (!profileId) {
      return NextResponse.json(
        {
          error: "Client profile not found",
        },
        {
          status: 404,
        },
      )
    }

    // ==========================================================
    // CASE
    // ==========================================================

    const caseResult =
      await query<ClientCaseRow>(
        `
          SELECT
            c.id,
            c.case_number,
            c.title,
            c.status,
            c.priority,
            c.created_at,
            COALESCE(c.progress, 0) AS progress
          FROM cases c
          WHERE
            c.id = $1
            AND (
              c.client_profile_id = $2
              OR c.case_user_id = $2
            )
          LIMIT 1
        `,
        [id, profileId],
      )

    if (caseResult.rows.length === 0) {
      return NextResponse.json(
        {
          error: "Case not found",
        },
        {
          status: 404,
        },
      )
    }

    const caseInfo =
      caseResult.rows[0]

    // ==========================================================
    // ORIGINAL CLIENT REQUEST
    //
    // This is the source for the restored Overview.
    // It contains what the client originally submitted.
    // ==========================================================

    const requestResult =
      await query<ClientRequestRow>(
        `
          SELECT
            r.id,

            r.client_email,
            r.contact_method,
            r.is_anonymous,

            r.service_type,
            r.title,
            r.description,
            r.investigation_objective,

            r.priority,
            r.currency,
            r.preferred_currency,

            r.subject_type,
            r.subject_full_name,
            r.subject_known_usernames,
            r.subject_emails,
            r.subject_phone_numbers,
            r.subject_location,
            r.subject_organization,
            r.subject_websites,

            r.subject_company_name,
            r.subject_company_website,
            r.subject_company_country,
            r.subject_company_industry,

            r.subject_domain,
            r.subject_url,
            r.subject_ip_address,
            r.subject_platform,

            r.subject_approximate_age,
            r.subject_height,
            r.subject_weight,
            r.subject_hair_color,
            r.subject_eye_color,
            r.subject_skin_tone,
            r.subject_distinguishing_marks,
            r.subject_nationality,
            r.subject_languages_spoken,

            r.subject_last_known_address,
            r.subject_last_known_occupation,

            r.subject_additional_usernames,
            r.subject_gaming_ids,
            r.subject_cryptocurrency_wallets,
            r.subject_domain_names,
            r.subject_ip_addresses,
            r.subject_vehicle_registration,

            r.existing_information,
            r.investigation_depth,
            r.confidentiality_level,
            r.authorization_confirmed,

            r.communication_method,
            r.communication_email,
            r.communication_country_code,
            r.communication_phone,
            r.communication_whatsapp,
            r.communication_signal,

            r.client_country,
            r.timeline,
            r.additional_notes,

            r.supporting_links,
            r.evidence_uploads
          FROM requests r
          WHERE r.converted_case_id = $1
          ORDER BY r.created_at DESC
          LIMIT 1
        `,
        [id],
      )

    const requestInfo =
      requestResult.rows[0] ?? null

    // ==========================================================
    // CLIENT-SAFE CASE ACTIVITY
    // ==========================================================

    const timelineResult =
      await query<ClientTimelineRow>(
        `
          SELECT
            id,
            update_type,
            title,
            content,
            created_at
          FROM case_updates
          WHERE case_id = $1
          ORDER BY created_at DESC
          LIMIT 10
        `,
        [id],
      )

    // ==========================================================
    // PUBLISHED REPORTS ONLY
    // ==========================================================

    const reportsResult =
      await query<ClientReportRow>(
        `
          SELECT
            id,
            title,
            file_url,
            summary,
            created_at
          FROM case_reports
          WHERE
            case_id = $1
            AND status IN (
              'delivered',
              'final',
              'published'
            )
            AND COALESCE(classification, 'confidential') <> 'internal'
          ORDER BY created_at DESC
        `,
        [id],
      )

    // ==========================================================
    // CLIENT MESSAGES
    //
    // Conversation membership is checked here.
    // The actual send/reply authorization still belongs to
    // /api/messages.
    // ==========================================================

    const messagesResult =
      await query<ClientMessageRow>(
        `
          SELECT
            m.id,
            m.conversation_id,
            m.case_id,
            m.sender_id,

            su.username AS sender_username,
            su.role AS sender_role,

            m.message,
            m.created_at,
            mr.read_at

          FROM messages m

          INNER JOIN conversations c
            ON c.id = m.conversation_id

          INNER JOIN conversation_members cm
            ON cm.conversation_id = c.id

          LEFT JOIN user_profiles sp
            ON sp.id = m.sender_id

          LEFT JOIN app_users su
            ON su.id = sp.user_id

          LEFT JOIN message_receipts mr
            ON mr.message_id = m.id
            AND mr.user_id = $2

          WHERE
            m.case_id = $1
            AND cm.user_id = $2

          ORDER BY m.created_at ASC
          LIMIT 200
        `,
        [id, user.id],
      )

    const messages =
      messagesResult.rows.map(
        (message) => ({
          id: message.id,
          sender_id:
            message.sender_id,
          sender_username:
            message.sender_username,
          sender_role:
            message.sender_role,
          message:
            message.message,
          created_at:
            message.created_at,
          read_at:
            message.read_at,
        }),
      )

    const conversationId =
      messagesResult.rows[0]
        ?.conversation_id ?? null

    const unreadCount =
      messagesResult.rows.filter(
        (message) =>
          message.read_at === null &&
          message.sender_id !==
            profileId,
      ).length

    // ==========================================================
    // AUDIT
    // ==========================================================

    try {
      await query(
        `
          INSERT INTO audit_logs
          (
            user_id,
            action,
            ip,
            user_agent,
            metadata
          )
          VALUES
          (
            $1,
            $2,
            NULL,
            NULL,
            $3::jsonb
          )
        `,
        [
          user.id,
          "view_client_case",
          JSON.stringify({
            case_id: id,
            source:
              "client_case_portal",
            report_count:
              reportsResult.rows.length,
          }),
        ],
      )
    } catch (auditError) {
      console.error(
        "CLIENT CASE AUDIT ERROR",
        auditError,
      )
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return NextResponse.json({
      case: {
        id: caseInfo.id,
        case_number:
          caseInfo.case_number,
        title:
          caseInfo.title,
        status:
          caseInfo.status,
        priority:
          caseInfo.priority,
        created_at:
          caseInfo.created_at,
        progress: Number(
          caseInfo.progress ?? 0,
        ),

        // Real database column:
        // requests.investigation_objective
        objective:
          requestInfo
            ?.investigation_objective ??
          null,
      },

      // ========================================================
      // FULL CLIENT SUBMISSION
      //
      // Safe to display in the client Overview because this is
      // the client's own submitted information.
      //
      // Internal case workspace data is NOT returned here.
      // ========================================================

      submission: requestInfo
        ? {
            id: requestInfo.id,

            client_email:
              requestInfo.client_email,

            contact_method:
              requestInfo.contact_method,

            is_anonymous:
              requestInfo.is_anonymous,

            service_type:
              requestInfo.service_type,

            title:
              requestInfo.title,

            description:
              requestInfo.description,

            investigation_objective:
              requestInfo.investigation_objective,

            priority:
              requestInfo.priority,

            currency:
              requestInfo.currency,

            preferred_currency:
              requestInfo.preferred_currency,

            subject_type:
              requestInfo.subject_type,

            subject_full_name:
              requestInfo.subject_full_name,

            subject_known_usernames:
              requestInfo.subject_known_usernames,

            subject_emails:
              requestInfo.subject_emails,

            subject_phone_numbers:
              requestInfo.subject_phone_numbers,

            subject_location:
              requestInfo.subject_location,

            subject_organization:
              requestInfo.subject_organization,

            subject_websites:
              requestInfo.subject_websites,

            subject_company_name:
              requestInfo.subject_company_name,

            subject_company_website:
              requestInfo.subject_company_website,

            subject_company_country:
              requestInfo.subject_company_country,

            subject_company_industry:
              requestInfo.subject_company_industry,

            subject_domain:
              requestInfo.subject_domain,

            subject_url:
              requestInfo.subject_url,

            subject_ip_address:
              requestInfo.subject_ip_address,

            subject_platform:
              requestInfo.subject_platform,

            subject_approximate_age:
              requestInfo.subject_approximate_age,

            subject_height:
              requestInfo.subject_height,

            subject_weight:
              requestInfo.subject_weight,

            subject_hair_color:
              requestInfo.subject_hair_color,

            subject_eye_color:
              requestInfo.subject_eye_color,

            subject_skin_tone:
              requestInfo.subject_skin_tone,

            subject_distinguishing_marks:
              requestInfo.subject_distinguishing_marks,

            subject_nationality:
              requestInfo.subject_nationality,

            subject_languages_spoken:
              requestInfo.subject_languages_spoken,

            subject_last_known_address:
              requestInfo.subject_last_known_address,

            subject_last_known_occupation:
              requestInfo.subject_last_known_occupation,

            subject_additional_usernames:
              requestInfo.subject_additional_usernames,

            subject_gaming_ids:
              requestInfo.subject_gaming_ids,

            subject_cryptocurrency_wallets:
              requestInfo.subject_cryptocurrency_wallets,

            subject_domain_names:
              requestInfo.subject_domain_names,

            subject_ip_addresses:
              requestInfo.subject_ip_addresses,

            subject_vehicle_registration:
              requestInfo.subject_vehicle_registration,

            existing_information:
              requestInfo.existing_information,

            investigation_depth:
              requestInfo.investigation_depth,

            confidentiality_level:
              requestInfo.confidentiality_level,

            authorization_confirmed:
              requestInfo.authorization_confirmed,

            communication_method:
              requestInfo.communication_method,

            communication_email:
              requestInfo.communication_email,

            communication_country_code:
              requestInfo.communication_country_code,

            communication_phone:
              requestInfo.communication_phone,

            communication_whatsapp:
              requestInfo.communication_whatsapp,

            communication_signal:
              requestInfo.communication_signal,

            client_country:
              requestInfo.client_country,

            timeline:
              requestInfo.timeline,

            additional_notes:
              requestInfo.additional_notes,

            supporting_links:
              requestInfo.supporting_links,

            evidence_uploads:
              requestInfo.evidence_uploads,
          }
        : null,

      timeline:
        timelineResult.rows,

      reports:
        reportsResult.rows,

      message_summary:
        conversationId
          ? {
              id: conversationId,
              case_id: id,
              unread_count:
                unreadCount,
              messages,
            }
          : null,
    })
  } catch (error) {
    console.error(
      "CLIENT CASE GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Case unavailable",
      },
      {
        status: 500,
      },
    )
  }
}
