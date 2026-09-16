import { NextResponse } from "next/server"

import { query } from "@/lib/db"

export async function GET(
  _req: Request,
  context: {
    params: Promise<{ token: string }>
  },
) {
  try {
    const { token } = await context.params

    const cleanToken =
      String(token || "").trim()

    if (!cleanToken) {
      return NextResponse.json(
        {
          verified: false,
          error: "Certificate verification token is required",
        },
        { status: 400 },
      )
    }

    const result = await query(
      `
        SELECT
          id,
          certificate_number,
          recipient_name,
          organization_name,
          training_title,
          training_type,
          trainer_name,
          completion_date,
          issued_at,
          status
        FROM training_certificates
        WHERE verification_token = $1
        LIMIT 1
      `,
      [cleanToken],
    )

    const certificate = result.rows[0]

    if (!certificate) {
      return NextResponse.json(
        {
          verified: false,
          error: "Certificate not found",
        },
        { status: 404 },
      )
    }

    const status =
      String(
        certificate.status || "",
      ).toLowerCase()

    const verified =
      status === "issued"

    return NextResponse.json({
      verified,

      certificate: {
        id: certificate.id,
        certificate_number:
          certificate.certificate_number,

        recipient_name:
          certificate.recipient_name,

        organization_name:
          certificate.organization_name,

        training_title:
          certificate.training_title,

        training_type:
          certificate.training_type,

        trainer_name:
          certificate.trainer_name,

        completion_date:
          certificate.completion_date
            ? String(
                certificate.completion_date,
              )
            : null,

        issued_at:
          certificate.issued_at
            ? String(
                certificate.issued_at,
              )
            : null,

        status:
          certificate.status,
      },
    })
  } catch (error) {
    console.error(
      "PUBLIC CERTIFICATE VERIFICATION ERROR:",
      error,
    )

    return NextResponse.json(
      {
        verified: false,
        error:
          "Unable to verify certificate",
      },
      { status: 500 },
    )
  }
}
