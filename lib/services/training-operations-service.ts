import { query } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { completeTrainingEngagement } from "@/lib/services/training-completion-service"
import { notifyUser } from "@/lib/services/notification-service"
import { generateICS } from "@/lib/utils/ics"
import { sendEmail } from "@/lib/email"

type AppUser = {
  id: string
  role: string
}

async function getUserProfileId(userId: string) {
  const result = await query<{ id: string }>(
    `SELECT id FROM user_profiles WHERE user_id = $1 LIMIT 1`,
    [userId],
  )

  return result.rows[0]?.id || null
}

export { getUserProfileId }

export async function assignTrainer(engagementId: string, trainerProfileId: string, actorProfileId: string | null) {
  await query(`UPDATE training_engagements SET assigned_trainer = $1, updated_at = NOW() WHERE id = $2`, [trainerProfileId, engagementId])

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "trainer_assigned",
    "Trainer Assigned",
    `Trainer profile ${trainerProfileId} assigned to engagement.`,
  )

  return { success: true }
}

async function createTrainingUpdate(
  trainingEngagementId: string,
  updatedBy: string | null,
  updateType: string,
  title: string,
  content: string,
) {
  await query(
    `INSERT INTO training_updates (training_engagement_id, updated_by, update_type, title, content) VALUES ($1, $2, $3, $4, $5)`,
    [trainingEngagementId, updatedBy, updateType, title, content],
  )
}

async function ensureAccess(
  engagementId: string,
  user: AppUser | null,
  allowTrainer = false,
): Promise<{ profileId: string | null; role: string | null }>
{
  if (!user) throw new Error("Unauthorized")

  // load engagement and assigned trainer/client
  const res = await query<{
    client_profile_id: string | null
    assigned_trainer: string | null
  }>(
    `SELECT client_profile_id, assigned_trainer FROM training_engagements WHERE id = $1 LIMIT 1`,
    [engagementId],
  )

  const engagement = res.rows[0]

  if (!engagement) throw new Error("Training engagement not found")

  const profileId = await getUserProfileId(user.id)

  // Admin and super admin have full access
  if (user.role === "administrator" || user.role === "super_administrator" || user.role === "super-administrator") {
    return { profileId, role: user.role }
  }

  // Trainer: must be assigned trainer
  if (user.role === "investigator" || user.role === "analyst") {
    if (allowTrainer && engagement.assigned_trainer && profileId === engagement.assigned_trainer) {
      return { profileId, role: user.role }
    }

    throw new Error("Forbidden")
  }

  // Client: must belong to client_profile_id
  if (user.role === "client") {
    if (profileId && engagement.client_profile_id === profileId) {
      return { profileId, role: user.role }
    }

    throw new Error("Forbidden")
  }

  throw new Error("Forbidden")
}

/* =======================================================
   Modules
   ======================================================= */

export async function listModules(engagementId: string) {
  const result = await query(
    `SELECT * FROM training_modules WHERE training_engagement_id = $1 ORDER BY module_order ASC, created_at ASC`,
    [engagementId],
  )

  return result.rows
}

export async function createModule(engagementId: string, payload: { title: string; description?: string; objectives?: string; module_order?: number }, actorProfileId: string | null) {
  const result = await query(
    `INSERT INTO training_modules (training_engagement_id, title, description, objectives, module_order, status, completion_percentage, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'not_started',0,$6,NOW(),NOW()) RETURNING *`,
    [engagementId, payload.title, payload.description || null, payload.objectives || null, payload.module_order || 0, actorProfileId],
  )

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "module_created",
    `Module Created: ${payload.title}`,
    `Module '${payload.title}' was created by a trainer or admin.`,
  )

  return result.rows[0]
}

export async function updateModule(moduleId: string, updates: any, actorProfileId: string | null) {
  const fields: string[] = []
  const values: any[] = []
  let ix = 1

  for (const key of ["title", "description", "objectives", "module_order", "status", "completion_percentage"]) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      fields.push(`${key} = $${ix}`)
      values.push((updates as any)[key])
      ix++
    }
  }

  if (fields.length === 0) throw new Error("No updates provided")

  values.push(moduleId)

  const sql = `UPDATE training_modules SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${ix} RETURNING *`
  const res = await query<{ training_engagement_id: string; title: string }>(sql, values)

  // create update entry if status or progress changed
  if (updates.status || updates.completion_percentage) {
    await createTrainingUpdate(
      res.rows[0].training_engagement_id,
      actorProfileId,
      "module_updated",
      `Module Updated: ${res.rows[0].title}`,
      `Module '${res.rows[0].title}' updated.`,
    )
  }

  return res.rows[0]
}

export async function deleteModule(moduleId: string, actorProfileId: string | null) {
  // load module for engagement id & title
  const mod = await query<{ training_engagement_id: string; title: string }>(`SELECT training_engagement_id, title FROM training_modules WHERE id = $1 LIMIT 1`, [moduleId])
  if (!mod.rows[0]) throw new Error("Module not found")

  await query(`DELETE FROM training_modules WHERE id = $1`, [moduleId])

  await createTrainingUpdate(
    mod.rows[0].training_engagement_id,
    actorProfileId,
    "module_deleted",
    `Module Deleted: ${mod.rows[0].title}`,
    `Module deleted by trainer or admin.`,
  )

  return { success: true }
}

/* =======================================================
   Sessions
   ======================================================= */

export async function listSessions(engagementId: string) {
  const res = await query(`
    SELECT ts.*, COALESCE(att.attendees, '[]'::json) AS attendees
    FROM training_sessions ts
    LEFT JOIN (
      SELECT session_id, json_agg(json_build_object('id', id, 'profile_id', profile_id, 'user_id', user_id, 'email', email, 'partstat', partstat, 'responded_at', responded_at)) AS attendees
      FROM training_session_attendees
      WHERE training_engagement_id = $1
      GROUP BY session_id
    ) att ON att.session_id = ts.id
    WHERE ts.training_engagement_id = $1
    ORDER BY ts.scheduled_at NULLS LAST
  `, [engagementId])

  return res.rows
}

export async function createSession(engagementId: string, payload: any, actorProfileId: string | null) {
  const res = await query(
    `INSERT INTO training_sessions (training_engagement_id, module_id, trainer_id, scheduled_at, duration_minutes, session_type, meeting_url, location, status, attendance_status, session_notes, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) RETURNING *`,
    [engagementId, payload.module_id || null, payload.trainer_id || null, payload.scheduled_at || null, payload.duration_minutes || null, payload.session_type || null, payload.meeting_url || null, payload.location || null, payload.status || 'scheduled', payload.attendance_status || 'pending', payload.session_notes || null],
  )

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "session_scheduled",
    `Session Scheduled`,
    `A training session has been scheduled.`,
  )

  // Notify trainer and client with an .ics attachment (in metadata)
  try {
    const session: any = res.rows[0]

    const start: string | null = session.scheduled_at ? String(session.scheduled_at) : null
    let end: string | null = null
    if (session.duration_minutes && start) {
      end = new Date(new Date(start).getTime() + Number(session.duration_minutes) * 60000).toISOString()
    }

    const title = String(session.session_notes || session.session_type || 'Training Session')

    // load engagement client and trainer emails to include as attendees
    const e = await query<{ client_profile_id: string | null }>(`SELECT client_profile_id FROM training_engagements WHERE id = $1 LIMIT 1`, [engagementId])
    const clientProfileId = e.rows[0]?.client_profile_id || null

    let trainerEmail: string | null = null
    if (session.trainer_id) {
      const t = await query<{ email: string | null }>(`SELECT u.email FROM user_profiles up JOIN app_users u ON u.id = up.user_id WHERE up.id = $1 LIMIT 1`, [session.trainer_id])
      trainerEmail = t.rows[0]?.email || null
    }

    let clientEmail: string | null = null
    if (clientProfileId) {
      const c = await query<{ email: string | null }>(`SELECT u.email FROM user_profiles up JOIN app_users u ON u.id = up.user_id WHERE up.id = $1 LIMIT 1`, [clientProfileId])
      clientEmail = c.rows[0]?.email || null
    }

    const usersToNotify: (string | null)[] = []
    if (session.trainer_id) {
      const t = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [session.trainer_id])
      if (t.rows[0]?.user_id) usersToNotify.push(t.rows[0].user_id)
    }
    if (clientProfileId) {
      const c = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [clientProfileId])
      if (c.rows[0]?.user_id) usersToNotify.push(c.rows[0].user_id)
    }

    const attendees = [] as { name?: string; email: string; rsvp?: boolean }[]
    if (trainerEmail) attendees.push({ email: trainerEmail, rsvp: true })
    if (clientEmail) attendees.push({ email: clientEmail, rsvp: true })

    // persist attendees rows for RSVP tracking
    try {
      const persistPromises: Promise<any>[] = []
      if (trainerEmail) {
        const tuser = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [session.trainer_id])
        const trainerUserId = tuser.rows[0]?.user_id || null
        persistPromises.push(query(
          `INSERT INTO training_session_attendees (session_id, training_engagement_id, profile_id, user_id, email, partstat, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) ON CONFLICT (session_id, user_id) DO NOTHING`,
          [session.id, engagementId, session.trainer_id || null, trainerUserId, trainerEmail, session.attendance_status || null]
        ))
      }
      if (clientEmail) {
        const cuser = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [clientProfileId])
        const clientUserId = cuser.rows[0]?.user_id || null
        persistPromises.push(query(
          `INSERT INTO training_session_attendees (session_id, training_engagement_id, profile_id, user_id, email, partstat, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) ON CONFLICT (session_id, user_id) DO NOTHING`,
          [session.id, engagementId, clientProfileId || null, clientUserId, clientEmail, session.attendance_status || null]
        ))
      }
      await Promise.all(persistPromises)
    } catch (persistErr) {
      // don't block session creation on attendee persistence
    }

    const organizerEmail = process.env.EMAIL_FROM || null
    const organizerName = process.env.EMAIL_FROM_NAME || 'ShadowNode'

    const ics = generateICS({
      uid: `training-session-${String(session.id)}`,
      title,
      description: session.session_notes ? String(session.session_notes) : undefined,
      start,
      end,
      url: session.meeting_url ? String(session.meeting_url) : null,
      location: session.location ? String(session.location) : null,
      method: 'REQUEST',
      organizer: organizerEmail ? { email: organizerEmail, name: organizerName } : undefined,
      attendees: attendees.length ? attendees.map((a) => ({ ...a, partstat: session.attendance_status || undefined })) : undefined,
      sequence: session.sequence || 0,
    })

    await Promise.all(usersToNotify.map((uid) => notifyUser(uid, {
      type: 'training_session_scheduled',
      title: 'Training session scheduled',
      message: `A training session has been scheduled: ${title}`,
      metadata: {
        training_session_id: session.id,
        ics_url: `/api/training/session/${session.id}/ics`,
        ics: ics,
      },
    })))
    // also send email with .ics attachment
    try {
      const uniqueUserIds = Array.from(new Set(usersToNotify.filter(Boolean))) as string[]
      await Promise.all(uniqueUserIds.map(async (userId) => {
        const ures = await query<{ email: string | null }>(`SELECT email FROM app_users WHERE id = $1 LIMIT 1`, [userId])
        const email = ures.rows[0]?.email || null
        if (!email) return

        const b64 = Buffer.from(ics).toString('base64')
        await sendEmail({
          to: email,
          subject: `Training session scheduled: ${title}`,
          html: `<p>${title}</p><p>Scheduled: ${start ? new Date(start).toLocaleString() : 'TBD'}</p><p><a href="${session.meeting_url || '#'}">Join meeting</a></p>`,
          attachments: [{ filename: `training-session-${session.id}.ics`, type: 'text/calendar', data: b64 }],
        }).catch(() => undefined)
      }))
    } catch (emailErr) {
      // ignore
    }
  } catch (notifyErr) {
    // don't block on notification errors
    console.error('SESSION NOTIFY ERROR', notifyErr)
  }

  return res.rows[0]
}

export async function updateSession(sessionId: string, updates: any, actorProfileId: string | null) {
  const fields: string[] = []
  const values: any[] = []
  let ix = 1

  for (const key of ["module_id","trainer_id","scheduled_at","duration_minutes","session_type","meeting_url","location","status","attendance_status","session_notes"]) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      fields.push(`${key} = $${ix}`)
      values.push((updates as any)[key])
      ix++
    }
  }

  if (fields.length === 0) throw new Error("No updates provided")

  values.push(sessionId)

  // increment sequence on update so ICS SEQUENCE increases
  const sql = `UPDATE training_sessions SET ${fields.join(", ")}, sequence = COALESCE(sequence,0) + 1, updated_at = NOW() WHERE id = $${ix} RETURNING *`
  const res = await query<{ training_engagement_id: string }>(sql, values)

  await createTrainingUpdate(
    res.rows[0].training_engagement_id,
    actorProfileId,
    "session_updated",
    `Session Updated`,
    `Session updated by trainer or admin.`,
  )

  // Notify trainer and client of reschedule/update with updated .ics
  try {
    const session = res.rows[0]
    const sres = await query(`SELECT * FROM training_sessions WHERE id = $1 LIMIT 1`, [sessionId])
    const full: any = sres.rows[0]

    const start: string | null = full.scheduled_at ? String(full.scheduled_at) : null
    let end: string | null = null
    if (full.duration_minutes && start) {
      end = new Date(new Date(start).getTime() + Number(full.duration_minutes) * 60000).toISOString()
    }

    const title = String(full.session_notes || full.session_type || 'Training Session')

    // find client profile for engagement
    const e = await query<{ client_profile_id: string | null }>(`SELECT client_profile_id FROM training_engagements WHERE id = $1 LIMIT 1`, [res.rows[0].training_engagement_id])
    const clientProfileId = e.rows[0]?.client_profile_id || null

    let trainerEmail: string | null = null
    if (full.trainer_id) {
      const t = await query<{ email: string | null }>(`SELECT u.email FROM user_profiles up JOIN app_users u ON u.id = up.user_id WHERE up.id = $1 LIMIT 1`, [full.trainer_id])
      trainerEmail = t.rows[0]?.email || null
    }

    let clientEmail: string | null = null
    if (clientProfileId) {
      const c = await query<{ email: string | null }>(`SELECT u.email FROM user_profiles up JOIN app_users u ON u.id = up.user_id WHERE up.id = $1 LIMIT 1`, [clientProfileId])
      clientEmail = c.rows[0]?.email || null
    }

    const usersToNotify: (string | null)[] = []
    if (full.trainer_id) {
      const t = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [full.trainer_id])
      if (t.rows[0]?.user_id) usersToNotify.push(t.rows[0].user_id)
    }
    if (clientProfileId) {
      const c = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [clientProfileId])
      if (c.rows[0]?.user_id) usersToNotify.push(c.rows[0].user_id)
    }

    const attendees = [] as { name?: string; email: string; rsvp?: boolean }[]
    if (trainerEmail) attendees.push({ email: trainerEmail, rsvp: true })
    if (clientEmail) attendees.push({ email: clientEmail, rsvp: true })

    const organizerEmail = process.env.EMAIL_FROM || null
    const organizerName = process.env.EMAIL_FROM_NAME || 'ShadowNode'

    const ics = generateICS({
      uid: `training-session-${String(full.id)}`,
      title,
      description: full.session_notes ? String(full.session_notes) : undefined,
      start,
      end,
      url: full.meeting_url ? String(full.meeting_url) : null,
      location: full.location ? String(full.location) : null,
      method: 'REQUEST',
      organizer: organizerEmail ? { email: organizerEmail, name: organizerName } : undefined,
      attendees: attendees.length ? attendees.map((a) => ({ ...a, partstat: full.attendance_status || undefined })) : undefined,
      sequence: full.sequence || 0,
    })

    await Promise.all(usersToNotify.map((uid) => notifyUser(uid, {
      type: 'training_session_updated',
      title: 'Training session updated',
      message: `A training session was updated: ${title}`,
      metadata: {
        training_session_id: full.id,
        ics_url: `/api/training/session/${full.id}/ics`,
        ics: ics,
      },
    })))
    // send update email with ICS
    try {
      const uniqueUserIds = Array.from(new Set(usersToNotify.filter(Boolean))) as string[]
      await Promise.all(uniqueUserIds.map(async (userId) => {
        const ures = await query<{ email: string | null }>(`SELECT email FROM app_users WHERE id = $1 LIMIT 1`, [userId])
        const email = ures.rows[0]?.email || null
        if (!email) return

        const b64 = Buffer.from(ics).toString('base64')
        await sendEmail({
          to: email,
          subject: `Training session updated: ${title}`,
          html: `<p>${title}</p><p>Scheduled: ${start ? new Date(start).toLocaleString() : 'TBD'}</p><p><a href="${full.meeting_url || '#'}">Join meeting</a></p>`,
          attachments: [{ filename: `training-session-${full.id}.ics`, type: 'text/calendar', data: b64 }],
        }).catch(() => undefined)
      }))
    } catch (emailErr) {
      // ignore
    }
  } catch (notifyErr) {
    console.error('SESSION UPDATE NOTIFY ERROR', notifyErr)
  }

  return res.rows[0]
}

export async function deleteSession(sessionId: string, actorProfileId: string | null) {
  // load session for notifying attendees with CANCEL ICS
  const sres = await query(`SELECT * FROM training_sessions WHERE id = $1 LIMIT 1`, [sessionId])
  const session: any = sres.rows[0]
  if (!session) throw new Error("Session not found")

  // generate CANCEL ICS with incremented sequence
  try {
    const start: string | null = session.scheduled_at ? String(session.scheduled_at) : null
    let end: string | null = null
    if (session.duration_minutes && start) {
      end = new Date(new Date(start).getTime() + Number(session.duration_minutes) * 60000).toISOString()
    }

    // gather emails
    let trainerEmail: string | null = null
    if (session.trainer_id) {
      const t = await query<{ email: string | null }>(`SELECT u.email FROM user_profiles up JOIN app_users u ON u.id = up.user_id WHERE up.id = $1 LIMIT 1`, [session.trainer_id])
      trainerEmail = t.rows[0]?.email || null
    }

    let clientEmail: string | null = null
    const e = await query<{ client_profile_id: string | null }>(`SELECT client_profile_id FROM training_engagements WHERE id = $1 LIMIT 1`, [session.training_engagement_id])
    const clientProfileId = e.rows[0]?.client_profile_id || null
    if (clientProfileId) {
      const c = await query<{ email: string | null }>(`SELECT u.email FROM user_profiles up JOIN app_users u ON u.id = up.user_id WHERE up.id = $1 LIMIT 1`, [clientProfileId])
      clientEmail = c.rows[0]?.email || null
    }

    const attendees = [] as { name?: string; email: string; rsvp?: boolean }[]
    if (trainerEmail) attendees.push({ email: trainerEmail })
    if (clientEmail) attendees.push({ email: clientEmail })

    const organizerEmail = process.env.EMAIL_FROM || null
    const organizerName = process.env.EMAIL_FROM_NAME || 'ShadowNode'

    const ics = generateICS({
      uid: `training-session-${String(session.id)}`,
      title: session.session_notes || session.session_type || 'Training Session',
      description: session.session_notes || undefined,
      start,
      end,
      url: session.meeting_url || null,
      location: session.location || null,
      method: 'CANCEL',
      organizer: organizerEmail ? { email: organizerEmail, name: organizerName } : undefined,
      attendees: attendees.length ? attendees : undefined,
      sequence: (session.sequence || 0) + 1,
    })

    const usersToNotify: (string | null)[] = []
    if (session.trainer_id) {
      const t = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [session.trainer_id])
      if (t.rows[0]?.user_id) usersToNotify.push(t.rows[0].user_id)
    }
    if (clientProfileId) {
      const c = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [clientProfileId])
      if (c.rows[0]?.user_id) usersToNotify.push(c.rows[0].user_id)
    }

    await Promise.all(usersToNotify.map((uid) => notifyUser(uid, {
      type: 'training_session_cancelled',
      title: 'Training session cancelled',
      message: `A training session was cancelled.`,
      metadata: {
        training_session_id: session.id,
        ics_url: `/api/training/session/${session.id}/ics`,
        ics: ics,
      },
    }))).catch(() => undefined)

    // send email CANCEL with ICS attachment
    try {
      const uniqueUserIds = Array.from(new Set(usersToNotify.filter(Boolean))) as string[]
      await Promise.all(uniqueUserIds.map(async (userId) => {
        const ures = await query<{ email: string | null }>(`SELECT email FROM app_users WHERE id = $1 LIMIT 1`, [userId])
        const email = ures.rows[0]?.email || null
        if (!email) return

        const b64 = Buffer.from(ics).toString('base64')
        await sendEmail({
          to: email,
          subject: `Training session cancelled: ${session.session_notes || 'Session'}`,
          html: `<p>The training session has been cancelled.</p>`,
          attachments: [{ filename: `training-session-${session.id}.ics`, type: 'text/calendar', data: b64 }],
        }).catch(() => undefined)
      }))
    } catch (emailErr) {
      // ignore
    }
  } catch (err) {
    // ignore notification errors
  }

  // finally delete the session
  await query(`DELETE FROM training_sessions WHERE id = $1`, [sessionId])

  await createTrainingUpdate(
    session.training_engagement_id,
    actorProfileId,
    "session_deleted",
    `Session Cancelled`,
    `Session deleted by trainer or admin.`,
  )

  return { success: true }
}

/* =======================================================
   Materials
   ======================================================= */

export async function listMaterials(engagementId: string) {
  const res = await query(`SELECT * FROM training_materials WHERE training_engagement_id = $1 ORDER BY created_at DESC`, [engagementId])
  return res.rows
}

export async function createMaterial(engagementId: string, payload: any, actorProfileId: string | null) {
  const res = await query(
    `INSERT INTO training_materials (training_engagement_id, module_id, title, description, material_type, file_url, external_url, visibility, uploaded_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
    [engagementId, payload.module_id || null, payload.title, payload.description || null, payload.material_type || 'other', payload.file_url || null, payload.external_url || null, payload.visibility || 'private', actorProfileId],
  )

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "material_uploaded",
    `Material Uploaded: ${payload.title}`,
    `A training material has been uploaded.`,
  )

  return res.rows[0]
}

export async function updateMaterial(materialId: string, updates: any, actorProfileId: string | null) {
  const fields: string[] = []
  const values: any[] = []
  let ix = 1

  for (const key of ["title","description","material_type","file_url","external_url","visibility"]) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      fields.push(`${key} = $${ix}`)
      values.push((updates as any)[key])
      ix++
    }
  }

  if (fields.length === 0) throw new Error("No updates provided")

  values.push(materialId)

  const sql = `UPDATE training_materials SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${ix} RETURNING *`
  const res = await query<{ training_engagement_id: string; title: string }>(sql, values)

  await createTrainingUpdate(
    res.rows[0].training_engagement_id,
    actorProfileId,
    "material_updated",
    `Material Updated: ${res.rows[0].title}`,
    `Material updated by trainer or admin.`,
  )

  return res.rows[0]
}

export async function deleteMaterial(materialId: string, actorProfileId: string | null) {
  const m = await query<{ training_engagement_id: string; title: string }>(`SELECT training_engagement_id, title FROM training_materials WHERE id = $1 LIMIT 1`, [materialId])
  if (!m.rows[0]) throw new Error("Material not found")

  await query(`DELETE FROM training_materials WHERE id = $1`, [materialId])

  await createTrainingUpdate(
    m.rows[0].training_engagement_id,
    actorProfileId,
    "material_deleted",
    `Material Deleted: ${m.rows[0].title}`,
    `Material deleted by trainer or admin.`,
  )

  return { success: true }
}

/* =======================================================
   Progress
   ======================================================= */

export async function listModuleProgress(engagementId: string, clientProfileId?: string) {
  if (clientProfileId) {
    const res = await query(`SELECT * FROM training_module_progress WHERE training_engagement_id = $1 AND client_profile_id = $2 ORDER BY created_at ASC`, [engagementId, clientProfileId])
    return res.rows
  }

  const res = await query(`SELECT * FROM training_module_progress WHERE training_engagement_id = $1 ORDER BY created_at ASC`, [engagementId])
  return res.rows
}

export async function upsertModuleProgress(engagementId: string, moduleId: string, clientProfileId: string, updates: { status?: string; completion_percentage?: number; trainer_notes?: string }, actorProfileId: string | null) {
  // try update existing
  const existing = await query(`SELECT id FROM training_module_progress WHERE training_engagement_id = $1 AND module_id = $2 AND client_profile_id = $3 LIMIT 1`, [engagementId, moduleId, clientProfileId])

  if (existing.rows[0]) {
    const fields: string[] = []
    const values: any[] = []
    let ix = 1

    if (updates.status !== undefined) { fields.push(`status = $${ix}`); values.push(updates.status); ix++ }
    if (updates.completion_percentage !== undefined) { fields.push(`completion_percentage = $${ix}`); values.push(updates.completion_percentage); ix++ }
    if (updates.trainer_notes !== undefined) { fields.push(`trainer_notes = $${ix}`); values.push(updates.trainer_notes); ix++ }

    values.push(existing.rows[0].id)

    const sql = `UPDATE training_module_progress SET ${fields.join(", ")}, updated_by = $${ix}, updated_at = NOW() WHERE id = $${ix+1} RETURNING *`
    values.splice(values.length - 1, 0, actorProfileId)

    const res = await query(sql, values)

    // recompute overall progress
    await recomputeEngagementProgress(engagementId, actorProfileId)

    await createTrainingUpdate(
      engagementId,
      actorProfileId,
      "progress_updated",
      `Module Progress Updated`,
      `Progress updated for module.`,
    )

    return res.rows[0]
  }

  const res = await query(`INSERT INTO training_module_progress (training_engagement_id,module_id,client_profile_id,status,completion_percentage,trainer_notes,updated_by,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING *`, [engagementId,moduleId,clientProfileId,updates.status||'not_started',updates.completion_percentage||0,updates.trainer_notes||null,actorProfileId])

  await recomputeEngagementProgress(engagementId, actorProfileId)

  await createTrainingUpdate(
    engagementId,
    actorProfileId,
    "progress_created",
    `Module Progress Recorded`,
    `Initial progress recorded for module.`,
  )

  return res.rows[0]
}

async function recomputeEngagementProgress(engagementId: string, actorProfileId: string | null) {
  // compute average completion across modules for all clients
  const res = await query<{ avg_completion: number }>(`SELECT AVG(completion_percentage) as avg_completion FROM training_module_progress WHERE training_engagement_id = $1`, [engagementId])
  const avg = Math.round(Number(res.rows[0]?.avg_completion || 0))

  await query(`UPDATE training_engagements SET progress = $1, updated_at = NOW() WHERE id = $2`, [avg, engagementId])

  // If progress reached 100%, attempt to trigger completion workflow
  if (avg >= 100) {
    // load assigned trainer
    const e = await query<{ assigned_trainer: string | null }>(`SELECT assigned_trainer FROM training_engagements WHERE id = $1 LIMIT 1`, [engagementId])
    const assignedTrainer = e.rows[0]?.assigned_trainer || null

    if (!assignedTrainer) {
      // create update: no trainer assigned
      await createTrainingUpdate(
        engagementId,
        actorProfileId,
        "progress_complete",
        "Progress reached 100%",
        "Overall progress reached 100% but no trainer is assigned. Assign a trainer to complete the engagement.",
      )
      return
    }

    // If the actor is the assigned trainer, call completion
    if (actorProfileId && assignedTrainer === actorProfileId) {
      try {
        await completeTrainingEngagement(engagementId, actorProfileId)

        await createTrainingUpdate(
          engagementId,
          actorProfileId,
          "auto_completion",
          "Training Completed",
          "Training was marked completed automatically after progress reached 100% by the assigned trainer.",
        )
      } catch (err: any) {
        // If completion failed, create an update with error info
        await createTrainingUpdate(
          engagementId,
          actorProfileId,
          "completion_error",
          "Completion Error",
          `Automatic completion failed: ${String(err?.message || err)}`,
        )
      }

      return
    }

    // If actor is not the assigned trainer, notify the assigned trainer to confirm completion
    try {
      const trainerUser = await query<{ user_id: string | null }>(`SELECT user_id FROM user_profiles WHERE id = $1 LIMIT 1`, [assignedTrainer])
      const trainerUserId = trainerUser.rows[0]?.user_id || null

      if (trainerUserId) {
        await notifyUser(trainerUserId, {
          type: "training_progress_complete",
          title: "Training progress reached 100%",
          message: "Overall progress reached 100%. Please confirm completion of the training engagement.",
          metadata: {
            training_engagement_id: engagementId,
            action: "confirm_completion",
          },
        })
      }
    } catch (notifyErr) {
      // ignore notification errors but create an update
    }

    await createTrainingUpdate(
      engagementId,
      actorProfileId,
      "progress_complete_pending",
      "Progress reached 100%",
      "Overall progress reached 100%. Awaiting assigned trainer confirmation to complete the engagement.",
    )
  }
}

export { ensureAccess }
