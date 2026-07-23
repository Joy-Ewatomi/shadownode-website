import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'


export async function POST(request: NextRequest) {
  try {

    const { email, username, password } = await request.json()

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Email and password (min 8 chars) required' },
        { status: 400 }
      )
    }


    // Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.signUp({
        email,
        password
      })


    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }


    // Create profile
    const { error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: authData.user?.id,
            email,
            full_name: username,
            role: 'client',
            created_at: new Date().toISOString()
          }
        ])


    if (profileError) {
      console.error('Profile creation error:', profileError)

      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      )
    }


    return NextResponse.json(
      {
        success: true,
        user: authData.user
      },
      { status: 201 }
    )


  } catch (error) {

    console.error('Signup error:', error)

    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    )
  }
}