import { NextRequest, NextResponse } from "next/server"
import { forwardTrack } from "@lib/data/track-proxy"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    await forwardTrack("/store/events", await req.json())
  } catch {}
  return new NextResponse(null, { status: 204 })
}
