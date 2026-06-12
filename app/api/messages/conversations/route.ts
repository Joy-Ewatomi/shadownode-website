import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// GET - List conversations for user
export async function GET(request: NextRequest) {
  try {
    // Get all active cases with message count
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .in('status', ['active', 'completed'])
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    // Transform to conversation format
    const conversations = data?.map(req => ({
      id: req.id,
      case_number: req.case_number || 'Pending',
      case_id: req.id,
      last_message: req.description?.substring(0, 50) || 'No messages yet',
      last_message_at: req.updated_at || req.created_at,
      unread_count: 0
    })) || []

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
