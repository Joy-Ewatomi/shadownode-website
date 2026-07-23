import { supabaseAuth } from '@/lib/supabase-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      )
    }

    // Find user email from username
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('username', username)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }


    // Login using Supabase Auth
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: profile.email,
      password
    })


    if (error) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }


    const response = NextResponse.json(
      {
        success: true,
        user: data.user
      },
      { status: 200 }
    )


    // Save session cookies
    if (data.session) {

      response.cookies.set(
        'sb-auth-token',
        data.session.access_token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/'
        }
      )


      response.cookies.set(
        'sb-user-id',
        data.user.id,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/'
        }
      )
    }


    return response


  } catch (error) {

    console.error('Login error:', error)

    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}