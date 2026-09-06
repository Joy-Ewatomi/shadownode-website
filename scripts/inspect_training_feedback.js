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
    const q = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'training_feedback' ORDER BY ordinal_position`;
    const r = await client.query(q)
    if (r.rows.length === 0) {
      console.log('No training_feedback table found or no columns')
    } else {
      console.log('training_feedback columns:')
      r.rows.forEach(row => console.log(`- ${row.column_name}: ${row.data_type}`))
    }
  } catch (err) {
    console.error('ERROR', err.message)
  } finally {
    await client.end()
  }
}

main()
