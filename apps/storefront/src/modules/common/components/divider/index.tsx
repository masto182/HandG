import { clx } from "@modules/common/components/ui"

type DividerProps = {
  label?: string
  className?: string
}

export default function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div className={clx("flex items-center gap-4", className)}>
        <div className="flex-1 h-px bg-outline-variant" />
        <span className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant">
          {label}
        </span>
        <div className="flex-1 h-px bg-outline-variant" />
      </div>
    )
  }

  return <div className={clx("h-px w-full bg-outline-variant", className)} />
}
