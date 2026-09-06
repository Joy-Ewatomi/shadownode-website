const fs = require('fs')
const { Client } = require('pg')

function loadEnv(path) {
  const res = {}
  try {
    const raw = fs.readFileSync(path, 'utf8')
    raw.split('\n').forEach(line => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/)
      if (m) {
        let v = m[2]
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
        res[m[1]] = v
      }
    })
  } catch (err) {}
  return res
}

const env = loadEnv('.env.local')
const DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found')
  process.exit(2)
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    const engagementId = process.argv[2] || ''
    if (!engagementId) {
      console.log('Provide engagement id as arg to inspect sample rows (or leave empty to list none)')
    }
    const q = `SELECT id, client_profile_id, rating, feedback AS comments, created_at FROM training_feedback WHERE training_engagement_id = $1 ORDER BY created_at DESC LIMIT 5`;
    const r = await client.query(q, [engagementId || null])
    console.log(r.rows)
  } catch (err) {
    console.error('ERROR', err.message)
  } finally {
    await client.end()
  }
}

main()
