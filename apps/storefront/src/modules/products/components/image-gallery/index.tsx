import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  thumbnail?: string | null
}

const ImageGallery = ({ images, thumbnail }: ImageGalleryProps) => {
  const displayUrl = images[0]?.url || thumbnail

  return (
    <div className="aspect-square max-h-[600px] bg-hg-surface-dim rounded-xl overflow-hidden flex items-center justify-center p-12 group">
      {displayUrl ? (
        <Image
          src={displayUrl}
          alt="Product image"
          width={800}
          height={800}
          priority
          className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-700"
        />
      ) : (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-hg-text-muted/20">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )}
    </div>
  )
}

export default ImageGallery
