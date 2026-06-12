import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const { case_id, content } = await request.json()

    if (!case_id || !content) {
      return NextResponse.json(
        { error: 'Case ID and content required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          case_id,
          sender: 'client',
          sender_name: 'Client',
          content,
          encrypted: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
