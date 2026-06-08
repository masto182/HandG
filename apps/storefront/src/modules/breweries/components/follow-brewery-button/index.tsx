"use client"

import { useState, useTransition } from "react"
import { followBrewery, unfollowBrewery } from "@lib/data/brewery-follows"

type FollowBreweryButtonProps = {
  breweryId: string
  initialFollowing: boolean
}

export default function FollowBreweryButton({
  breweryId,
  initialFollowing,
}: FollowBreweryButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    const next = !following
    setFollowing(next)
    startTransition(async () => {
      const ok = next
        ? await followBrewery(breweryId)
        : await unfollowBrewery(breweryId)
      if (!ok) setFollowing(!next)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 px-8 py-3 font-bold rounded-xl active:scale-95 transition-all ${
        following
          ? "bg-hl-primary/20 border border-hl-primary text-hl-primary"
          : "bg-hl-primary text-white"
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={following ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {following
        ? "New Release Notifications Active"
        : "Notify Me on New Releases"}
    </button>
  )
}
