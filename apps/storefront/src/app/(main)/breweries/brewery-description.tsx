"use client"

import { useRef, useState, useEffect } from "react"

export default function BreweryDescription({ text }: { text: string }) {
  const [clamped, setClamped] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (ref.current) {
      setClamped(ref.current.scrollHeight > ref.current.clientHeight)
    }
  }, [text])

  return (
    <div className="min-h-[2.5rem] mb-4 relative">
      <p
        ref={ref}
        className={`text-sm text-hg-text-secondary ${expanded ? "" : "line-clamp-2"}`}
      >
        {text}
      </p>
      {clamped && !expanded && (
        <button
          onClick={(e) => { e.preventDefault(); setExpanded(true) }}
          className="text-xs text-hg-gold hover:text-hg-gold-hover transition-colors mt-1"
        >
          More
        </button>
      )}
      {expanded && (
        <button
          onClick={(e) => { e.preventDefault(); setExpanded(false) }}
          className="text-xs text-hg-text-secondary hover:text-hg-text transition-colors mt-1"
        >
          Less
        </button>
      )}
    </div>
  )
}
