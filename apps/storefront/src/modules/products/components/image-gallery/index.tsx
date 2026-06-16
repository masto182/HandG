"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useCallback, useRef, useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  thumbnail?: string | null
}

const ImageGallery = ({ images, thumbnail }: ImageGalleryProps) => {
  const slides: string[] =
    images.length > 0
      ? images.map((img) => img.url).filter(Boolean)
      : thumbnail
        ? [thumbnail]
        : []

  const [activeIdx, setActiveIdx] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const idx = Math.round(track.scrollLeft / track.clientWidth)
    setActiveIdx(idx)
  }, [])

  const goTo = (idx: number) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: idx * track.clientWidth, behavior: "smooth" })
  }

  if (slides.length === 0) {
    return (
      <div className="aspect-square max-h-[600px] bg-hg-surface-dim rounded-xl overflow-hidden relative flex items-center justify-center">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-hg-text-muted/20"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Scroll track */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-xl"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {slides.map((url, i) => (
          <div
            key={url + i}
            className="snap-start shrink-0 w-full aspect-square max-h-[600px] bg-hg-surface-dim overflow-hidden group relative"
          >
            <Image
              src={url}
              alt={`Product image ${i + 1}`}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover transform group-hover:scale-105 transition-transform duration-700"
            />
          </div>
        ))}
      </div>

      {/* Dot indicators — only when multiple images */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === activeIdx
                  ? "w-4 h-1.5 bg-hg-gold"
                  : "w-1.5 h-1.5 bg-hg-border hover:bg-hg-text-secondary"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
