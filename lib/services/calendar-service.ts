import crypto from "crypto"
import { google } from "googleapis"
import { query } from "@/lib/db"

const GOOGLE_PROVIDER = "google"

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events"

const ENCRYPTION_ALGORITHM = "aes-256-gcm"

type CalendarConnectionRow = {
  id: string
  user_id: string
  provider: string
  provider_account_id: string | null
  email: string | null
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: Date | string | null
  calendar_id: string
  scopes: string | null
  status: string
}

function getEncryptionKey() {
  const raw =
    process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY

  if (!raw) {
    throw new Error(
      "GOOGLE_CALENDAR_ENCRYPTION_KEY is not configured",
    )
  }

  const key = Buffer.from(raw, "hex")

  if (key.length !== 32) {
    throw new Error(
      "GOOGLE_CALENDAR_ENCRYPTION_KEY must be a 32-byte hexadecimal key",
    )
  }

  return key
}

function encryptToken(value: string) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)

  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    iv,
  )

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":")
}

function decryptToken(value: string) {
  const key = getEncryptionKey()

  const parts = value.split(":")

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted calendar token",
    )
  }

  const [ivHex, authTagHex, encryptedHex] =
    parts

  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(
    authTagHex,
    "hex",
  )
  const encrypted = Buffer.from(
    encryptedHex,
    "hex",
  )

  if (
    iv.length !== 12 ||
    authTag.length !== 16 ||
    encrypted.length === 0
  ) {
    throw new Error(
      "Invalid encrypted calendar token",
    )
  }

  const decipher =
    crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      iv,
    )

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

function getGoogleOAuthClient() {
const clientId =
  process.env.GOOGLE_CALENDAR_CLIENT_ID

const clientSecret =
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const redirectUri = `${appUrl}/api/calendar/google/callback`

  console.log("GOOGLE OAUTH CONFIG:", {
    clientId: clientId
      ? `${clientId.slice(0, 20)}...`
      : "MISSING",
    appUrl,
    redirectUri,
  })

  if (!clientId || !clientSecret || !appUrl) {
    throw new Error(
      "Google Calendar OAuth is not configured",
    )
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  )
}

export function getGoogleCalendarAuthorizationUrl(
  state: string,
) {
  const oauth = getGoogleOAuthClient()

  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,

    scope: [
      "openid",
      "email",
      "profile",
      GOOGLE_CALENDAR_SCOPE,
    ],

    state,
  })
}

export async function exchangeGoogleCalendarCode(
  code: string,
) {
  const oauth = getGoogleOAuthClient()

  const { tokens } =
    await oauth.getToken(code)

  if (!tokens.access_token) {
    throw new Error(
      "Google did not return an access token",
    )
  }

  return {
    accessToken: tokens.access_token,

    refreshToken:
      tokens.refresh_token || null,

    expiryDate:
      tokens.expiry_date || null,
  }
}

export async function getGoogleCalendarProfile(
  accessToken: string,
) {
  const oauth = getGoogleOAuthClient()

  oauth.setCredentials({
    access_token: accessToken,
  })

  const oauth2 = google.oauth2({
    auth: oauth,
    version: "v2",
  })

  const response =
    await oauth2.userinfo.get()

  return {
    id:
      response.data.id || null,

    email:
      response.data.email || null,
  }
}

export async function getGoogleCalendarConnection(
  userId: string,
) {
  const result =
    await query<CalendarConnectionRow>(
      `
      SELECT
        id,
        user_id,
        provider,
        provider_account_id,
        email,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at,
        calendar_id,
        scopes,
        status
      FROM calendar_connections
      WHERE user_id = $1
        AND provider = 'google'
        AND status = 'connected'
      LIMIT 1
      `,
      [userId],
    )

  return result.rows[0] || null
}

export async function saveGoogleCalendarConnection(
  input: {
    userId: string
    providerAccountId?: string | null
    email?: string | null
    accessToken: string
    refreshToken?: string | null
    expiryDate?: number | null
  },
) {
  const accessTokenEncrypted =
    encryptToken(input.accessToken)

  const refreshTokenEncrypted =
    input.refreshToken
      ? encryptToken(input.refreshToken)
      : null

  const tokenExpiresAt =
    input.expiryDate
      ? new Date(input.expiryDate)
      : null

  const result = await query<{ id: string }>(
    `
    INSERT INTO calendar_connections (
      user_id,
      provider,
      provider_account_id,
      email,
      access_token_encrypted,
      refresh_token_encrypted,
      token_expires_at,
      calendar_id,
      scopes,
      status,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      'google',
      $2,
      $3,
      $4,
      $5,
      $6,
      'primary',
      $7,
      'connected',
      NOW(),
      NOW()
    )
    ON CONFLICT (
      user_id,
      provider
    )
    DO UPDATE SET
      provider_account_id =
        EXCLUDED.provider_account_id,

      email =
        EXCLUDED.email,

      access_token_encrypted =
        EXCLUDED.access_token_encrypted,

      refresh_token_encrypted =
        COALESCE(
          EXCLUDED.refresh_token_encrypted,
          calendar_connections.refresh_token_encrypted
        ),

      token_expires_at =
        EXCLUDED.token_expires_at,

      scopes =
        EXCLUDED.scopes,

      status =
        'connected',

      updated_at =
        NOW()

    RETURNING id
    `,
    [
      input.userId,
      input.providerAccountId || null,
      input.email || null,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt,
      GOOGLE_CALENDAR_SCOPE,
    ],
  )

  return result.rows[0]?.id || null
}

async function refreshGoogleAccessTokenIfNeeded(
  connection: CalendarConnectionRow,
) {
  const oauth = getGoogleOAuthClient()

  const accessToken =
    connection.access_token_encrypted
      ? decryptToken(
          connection.access_token_encrypted,
        )
      : null

  const refreshToken =
    connection.refresh_token_encrypted
      ? decryptToken(
          connection.refresh_token_encrypted,
        )
      : null

  if (!refreshToken) {
    if (!accessToken) {
      throw new Error(
        "Google Calendar connection has no usable token",
      )
    }

    oauth.setCredentials({
      access_token: accessToken,
    })

    return oauth
  }

  const expiresAt =
    connection.token_expires_at
      ? new Date(
          connection.token_expires_at,
        ).getTime()
      : 0

  const shouldRefresh =
    !accessToken ||
    !expiresAt ||
    expiresAt <=
      Date.now() + 60_000

  if (!shouldRefresh) {
    oauth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiresAt,
    })

    return oauth
  }

  oauth.setCredentials({
    access_token:
      accessToken || undefined,

    refresh_token:
      refreshToken,

    expiry_date:
      expiresAt || undefined,
  })

  const refreshed =
    await oauth.getAccessToken()

  if (!refreshed.token) {
    throw new Error(
      "Google Calendar access token refresh failed",
    )
  }

  const credentials =
    oauth.credentials

  const newAccessToken =
    credentials.access_token ||
    refreshed.token

  const newExpiry =
    credentials.expiry_date ||
    Date.now() + 3600 * 1000

  await query(
    `
    UPDATE calendar_connections
    SET
      access_token_encrypted = $1,
      token_expires_at = $2,
      status = 'connected',
      updated_at = NOW()
    WHERE id = $3
    `,
    [
      encryptToken(newAccessToken),
      new Date(newExpiry),
      connection.id,
    ],
  )

  oauth.setCredentials({
    access_token:
      newAccessToken,

    refresh_token:
      refreshToken,

    expiry_date:
      newExpiry,
  })

  return oauth
}

async function getCalendarClient(
  connection: CalendarConnectionRow,
) {
  const auth =
    await refreshGoogleAccessTokenIfNeeded(
      connection,
    )

  return google.calendar({
    version: "v3",
    auth,
  })
}

function getSessionStart(
  session: any,
) {
  if (!session.scheduled_at) {
    return null
  }

  const date =
    new Date(
      String(session.scheduled_at),
    )

  if (
    Number.isNaN(date.getTime())
  ) {
    return null
  }

  return date
}

function getSessionEnd(
  session: any,
) {
  const start =
    getSessionStart(session)

  if (!start) {
    return null
  }

  const duration =
    Number(
      session.duration_minutes || 60,
    )

  return new Date(
    start.getTime() +
      duration * 60_000,
  )
}

function getSessionTitle(
  session: any,
) {
  return (
    String(
      session.title ||
        session.session_title ||
        session.session_type ||
        "ShadowNode Training Session",
    ).trim()
  )
}

async function getSessionAttendees(
  sessionId: string,
) {
  const result =
    await query<{
      email: string | null
    }>(
      `
      SELECT email
      FROM training_session_attendees
      WHERE session_id = $1
        AND email IS NOT NULL
      `,
      [sessionId],
    )

  return result.rows
    .map(
      (row) =>
        row.email?.trim() || null,
    )
    .filter(
      (
        email,
      ): email is string =>
        Boolean(email),
    )
}

async function buildGoogleEvent(
  session: any,
) {
  const start =
    getSessionStart(session)

  const end =
    getSessionEnd(session)

  if (!start || !end) {
    throw new Error(
      "Training session must have a scheduled date and time",
    )
  }

  const attendeeEmails =
    await getSessionAttendees(
      session.id,
    )

  const attendees =
    attendeeEmails.map(
      (email) => ({
        email,
      }),
    )

  let description =
    "ShadowNode cybersecurity training session."

  if (session.session_notes) {
    description =
      String(
        session.session_notes,
      )
  }

  if (session.meeting_url) {
    description +=
      `\n\nMeeting URL: ${String(
        session.meeting_url,
      )}`
  }

  const event: any = {
    summary:
      getSessionTitle(session),

    description,

    start: {
      dateTime:
        start.toISOString(),
    },

    end: {
      dateTime:
        end.toISOString(),
    },

    attendees,

    status:
      session.status ===
      "cancelled"
        ? "cancelled"
        : "confirmed",

    extendedProperties: {
      private: {
        shadownode_training_session_id:
          String(session.id),

        shadownode_engagement_id:
          String(
            session.training_engagement_id,
          ),
      },
    },
  }

  if (session.location) {
    event.location =
      String(session.location)
  }

  return event
}

export async function syncTrainingSessionToGoogle(
  sessionId: string,
) {
  const sessionResult =
    await query(
      `
      SELECT *
      FROM training_sessions
      WHERE id = $1
      LIMIT 1
      `,
      [sessionId],
    )

  const session =
    sessionResult.rows[0]

  if (!session) {
    throw new Error(
      "Training session not found",
    )
  }

  const engagementId =
    String(
      session.training_engagement_id,
    )

  const engagementResult =
    await query<{
      client_profile_id: string | null
    }>(
      `
      SELECT client_profile_id
      FROM training_engagements
      WHERE id = $1
      LIMIT 1
      `,
      [engagementId],
    )

  const clientProfileId =
    engagementResult.rows[0]
      ?.client_profile_id ||
    null

  if (!clientProfileId) {
    return {
      synced: false,
      reason:
        "Training engagement has no client",
    }
  }

  const clientUserResult =
    await query<{
      user_id: string | null
    }>(
      `
      SELECT user_id
      FROM user_profiles
      WHERE id = $1
      LIMIT 1
      `,
      [clientProfileId],
    )

  const clientUserId =
    clientUserResult.rows[0]
      ?.user_id ||
    null

  if (!clientUserId) {
    return {
      synced: false,
      reason:
        "Client user account not found",
    }
  }

  const connection =
    await getGoogleCalendarConnection(
      clientUserId,
    )

  if (!connection) {
    return {
      synced: false,
      reason:
        "Client Google Calendar is not connected",
    }
  }

  try {
    const calendar =
      await getCalendarClient(
        connection,
      )

    const existingResult =
      await query<{
        id: string
        external_event_id: string
      }>(
        `
        SELECT
          id,
          external_event_id
        FROM training_session_calendar_events
        WHERE training_session_id = $1
          AND calendar_connection_id = $2
        LIMIT 1
        `,
        [
          sessionId,
          connection.id,
        ],
      )

    const event =
      await buildGoogleEvent(
        session,
      )

    let externalEventId:
      | string
      | null = null

    if (
      existingResult.rows[0]
    ) {
      externalEventId =
        existingResult.rows[0]
          .external_event_id

      const updated =
        await calendar.events.update({
          calendarId:
            connection.calendar_id ||
            "primary",

          eventId:
            externalEventId,

          requestBody:
            event,

          sendUpdates:
            "all",
        })

      externalEventId =
        updated.data.id ||
        externalEventId
    } else {
      const created =
        await calendar.events.insert({
          calendarId:
            connection.calendar_id ||
            "primary",

          requestBody:
            event,

          sendUpdates:
            "all",
        })

      externalEventId =
        created.data.id ||
        null
    }

    if (!externalEventId) {
      throw new Error(
        "Google Calendar did not return an event ID",
      )
    }

    await query(
      `
      INSERT INTO training_session_calendar_events (
        training_session_id,
        calendar_connection_id,
        provider,
        calendar_id,
        external_event_id,
        sync_status,
        last_synced_at,
        last_error,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        'google',
        $3,
        $4,
        'synced',
        NOW(),
        NULL,
        NOW(),
        NOW()
      )
      ON CONFLICT (
        training_session_id,
        calendar_connection_id
      )
      DO UPDATE SET
        external_event_id =
          EXCLUDED.external_event_id,

        calendar_id =
          EXCLUDED.calendar_id,

        sync_status =
          'synced',

        last_synced_at =
          NOW(),

        last_error =
          NULL,

        updated_at =
          NOW()
      `,
      [
        sessionId,
        connection.id,
        connection.calendar_id ||
          "primary",
        externalEventId,
      ],
    )

    return {
      synced: true,
      eventId:
        externalEventId,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error)

    await query(
      `
      UPDATE training_session_calendar_events
      SET
        sync_status = 'error',
        last_error = $1,
        updated_at = NOW()
      WHERE training_session_id = $2
        AND calendar_connection_id = $3
      `,
      [
        message,
        sessionId,
        connection.id,
      ],
    )

    throw error
  }
}

export async function cancelTrainingSessionCalendarEvent(
  sessionId: string,
) {
  const mappings =
    await query<{
      id: string
      calendar_connection_id: string
      calendar_id: string
      external_event_id: string
    }>(
      `
      SELECT
        id,
        calendar_connection_id,
        calendar_id,
        external_event_id
      FROM training_session_calendar_events
      WHERE training_session_id = $1
        AND sync_status != 'cancelled'
      `,
      [sessionId],
    )

  for (
    const mapping of mappings.rows
  ) {
    try {
      const connectionResult =
        await query<CalendarConnectionRow>(
          `
          SELECT *
          FROM calendar_connections
          WHERE id = $1
            AND status = 'connected'
          LIMIT 1
          `,
          [
            mapping.calendar_connection_id,
          ],
        )

      const connection =
        connectionResult.rows[0]

      if (!connection) {
        continue
      }

      const calendar =
        await getCalendarClient(
          connection,
        )

      try {
        await calendar.events.delete({
          calendarId:
            mapping.calendar_id ||
            "primary",

          eventId:
            mapping.external_event_id,

          sendUpdates:
            "all",
        })
      } catch (error: any) {
        if (
          error?.code !== 404
        ) {
          throw error
        }
      }

      await query(
        `
        UPDATE training_session_calendar_events
        SET
          sync_status = 'cancelled',
          last_synced_at = NOW(),
          last_error = NULL,
          updated_at = NOW()
        WHERE id = $1
        `,
        [mapping.id],
      )
    } catch (error) {
      await query(
        `
        UPDATE training_session_calendar_events
        SET
          sync_status = 'error',
          last_error = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [
          error instanceof Error
            ? error.message
            : String(error),
          mapping.id,
        ],
      )
    }
  }

  return {
    success: true,
  }
}

export async function disconnectGoogleCalendar(
  userId: string,
) {
  const connection =
    await getGoogleCalendarConnection(
      userId,
    )

  if (!connection) {
    return {
      success: true,
    }
  }

  await query(
    `
    UPDATE calendar_connections
    SET
      status = 'disconnected',
      access_token_encrypted = NULL,
      refresh_token_encrypted = NULL,
      updated_at = NOW()
    WHERE id = $1
    `,
    [connection.id],
  )

  return {
    success: true,
  }
}

export async function getCalendarStatus(
  userId: string,
) {
  const connection =
    await getGoogleCalendarConnection(
      userId,
    )

  return {
    connected:
      Boolean(connection),

    provider:
      connection?.provider ||
      null,

    email:
      connection?.email ||
      null,

    calendarId:
      connection?.calendar_id ||
      null,
  }
}