import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { NextRequest, NextResponse } from 'next/server'
import { estimatePrice } from '@/lib/pricing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceType, description, timeline, contact, email } = body

    // Generate unique token for anonymous tracking
    const token = nanoid(32)

    // Calculate estimated price
    const priceEstimate = estimatePrice({
      serviceType,
      description,
      timeline
    })

    // Create anonymous request with estimated price stored in budget field
    const { data, error } = await supabase
      .from('requests')
      .insert([
        {
          token,
          service_type: serviceType,
          description,
          timeline,
          contact_method: contact,
          client_email: email,
          budget: `$${priceEstimate.estimatedPrice.toLocaleString()}`,
          status: 'submitted',
          is_anonymous: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to submit request' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { token, id: data.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
