import { NextResponse } from 'next/server'

const LYZR_API_KEY = process.env.LYZR_API_KEY || ''
const AGENT_ID = '698a1b3f0769219591839a9c'

export async function GET() {
  if (!LYZR_API_KEY) {
    return NextResponse.json(
      { error: 'LYZR_API_KEY not configured' },
      { status: 500 }
    )
  }

  const wsUrl = `wss://agent-prod.studio.lyzr.ai/v3/voice/chat/?agent_id=${AGENT_ID}&x_api_key=${LYZR_API_KEY}`

  return NextResponse.json({ wsUrl })
}
