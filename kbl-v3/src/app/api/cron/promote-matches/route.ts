import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // Protect from unauthorized calls - Vercel sends this header for cron jobs
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()

  // Promote any upcoming matches whose start time has passed to 'live'
  const { error } = await supabase
    .from('matches')
    .update({ status: 'live' })
    .eq('status', 'upcoming')
    .lte('match_date', new Date().toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/dashboard')

  return NextResponse.json({ success: true })
}
