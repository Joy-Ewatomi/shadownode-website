import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  )

  // Clear auth cookies
  response.cookies.delete('sb-auth-token')
  response.cookies.delete('sb-user-id')

  return response
}
