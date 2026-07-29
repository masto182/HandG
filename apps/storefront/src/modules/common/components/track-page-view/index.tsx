"use client"

import { useEffect } from "react"
import { useTrack } from "@lib/hooks/use-track"

export default function TrackPageView({
  event,
  payload,
}: {
  event: string
  payload?: Record<string, unknown>
}) {
  const track = useTrack()
   
  useEffect(() => {
    track(event, payload ?? {})
  }, [])
  return null
}
