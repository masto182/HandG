import { clx } from "@modules/common/components/ui"

type IconProps = {
  name: string
  className?: string
  size?: number
  filled?: boolean
}

export default function Icon({ name, className, size = 24, filled = false }: IconProps) {
  return (
    <span
      className={clx(
        "material-symbols-outlined select-none align-middle leading-none",
        className
      )}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  )
}
