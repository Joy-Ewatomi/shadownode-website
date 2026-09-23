import crypto from "crypto"
import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { notifyAdmins } from "@/lib/services/notification-service"

const CONTACT_METHODS = new Set(["email", "whatsapp", "signal"])

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const serviceType = text(body.service_type)
    const description = text(
      body.description ||
        body.custom_description ||
        body.training_goal ||
        body.training_objective,
    )
    const timeline = text(
      body.timeline ||
        body.osint_completion_date ||
        body.training_preferred_completion_date,
    )
    const email = text(body.email || body.communication_email).toLowerCase()
    const contactMethod = text(body.contact_method || body.communication_method).toLowerCase()
    const contactDetails = text(
      body.contact_details ||
        body.communication_whatsapp ||
        body.communication_signal ||
        body.communication_phone,
    )
    const authorizationConfirmed = body.authorization_confirmed === true

    if (!serviceType) {
      return NextResponse.json({ error: "Select a service." }, { status: 400 })
    }
    if (description.length < 20) {
      return NextResponse.json({ error: "Describe the request in at least 20 characters." }, { status: 400 })
    }
    if (contactMethod === "email" && !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid communication email." }, { status: 400 })
    }
    if (!CONTACT_METHODS.has(contactMethod)) {
      return NextResponse.json({ error: "Select a supported contact method." }, { status: 400 })
    }
    if (contactMethod !== "email" && !contactDetails) {
      return NextResponse.json({ error: `Enter the ${contactMethod} contact details.` }, { status: 400 })
    }
    if (!authorizationConfirmed) {
      return NextResponse.json({ error: "Confirm that you are authorized to submit this request." }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const token = nanoid(32)
    const title = description.length > 100
      ? `${description.slice(0, 97).trim()}...`
      : description

    await query(
      `
        INSERT INTO requests (
          id, user_id, client_email, contact_method, token, is_anonymous,
          title, description, service_type, status, timeline,
          authorization_confirmed, communication_method,
          communication_email, communication_whatsapp, communication_signal,
          investigation_objective, subject_type, existing_information,
          supporting_links, evidence_uploads, additional_notes,
          client_country, preferred_currency, osint_completion_date,
          training_organization_name, training_goal, training_topics,
          training_preferred_start_date, training_preferred_completion_date,
          training_details,
          created_at, updated_at
        )
        VALUES (
          $1, NULL, NULLIF($2, ''), $3, $4, TRUE,
          $5, $6, $7, 'pending_admin_review', NULLIF($8, ''),
          TRUE, $3, NULLIF($2, ''),
          CASE WHEN $3 = 'whatsapp' THEN NULLIF($9, '') ELSE NULL END,
          CASE WHEN $3 = 'signal' THEN NULLIF($9, '') ELSE NULL END,
          NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''),
          $13::jsonb, $14::jsonb, NULLIF($15, ''),
          NULLIF($16, ''), NULLIF($17, ''), NULLIF($18, '')::date,
          NULLIF($19, ''), NULLIF($20, ''), NULLIF($21, ''),
          NULLIF($22, '')::date, NULLIF($23, '')::date,
          $24::jsonb,
          NOW(), NOW()
        )
      `,
      [
        id,
        email,
        contactMethod,
        token,
        title,
        description,
        serviceType,
        timeline,
        contactDetails,
        text(body.investigation_objective || body.training_objective),
        text(body.subject_type),
        text(body.existing_information),
        JSON.stringify(Array.isArray(body.supporting_links) ? body.supporting_links : []),
        JSON.stringify(Array.isArray(body.evidence_files) ? body.evidence_files : []),
        text(body.additional_notes || body.training_additional_requirements),
        text(body.client_country),
        text(body.preferred_currency),
        text(body.osint_completion_date),
        text(body.training_organization_name),
        text(body.training_goal),
        Array.isArray(body.training_topics_selected)
          ? body.training_topics_selected.join(", ")
          : text(body.training_topics),
        text(body.training_preferred_start_date),
        text(body.training_preferred_completion_date),
        JSON.stringify(text(body.category) === "cybersecurity" ? body : {}),
      ],
    )

    await notifyAdmins({
      type: "client_request",
      title: "New anonymous request",
      message: `${title} requires administrator review.`,
      metadata: {
        request_id: id,
        resource_type: "request",
        resource_id: id,
        audience: "administrator",
        target_page: "admin_request_review",
        action: "view_request",
        anonymous: true,
      },
    }).catch((notificationError) => {
      console.error("ANONYMOUS REQUEST NOTIFICATION ERROR:", notificationError)
    })

    return NextResponse.json({ id, token }, { status: 201 })
  } catch (error) {
    console.error("ANONYMOUS REQUEST ERROR:", error)
    return NextResponse.json({ error: "Unable to submit the request." }, { status: 500 })
  }
}
