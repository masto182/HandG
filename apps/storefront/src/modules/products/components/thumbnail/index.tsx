import { Container, clx } from "@modules/common/components/ui"
import Image from "next/image"
import React from "react"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <Container
      className={clx(
        "relative w-full overflow-hidden shadow-none group-hover:shadow-none transition-shadow ease-in-out duration-150 !bg-transparent !rounded-none !p-0",
        className,
        {
          "aspect-[1/1]": true,
          "w-[180px] p-4 rounded-xl": size === "small",
          "w-[290px] p-4 rounded-xl": size === "medium",
          "w-[440px] p-4 rounded-xl": size === "large",
          "w-full": size === "full",
          "w-full p-1 rounded-lg": size === "square",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} />
    </Container>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
}: Pick<ThumbnailProps, "size"> & { image?: string }) => {
  return (
    <Image
      src={image || "/placeholder-can.jpg"}
      alt="Thumbnail"
      className="absolute inset-0 object-cover object-center"
      draggable={false}
      quality={50}
      sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
      fill
    />
  )
}

export default Thumbnail
