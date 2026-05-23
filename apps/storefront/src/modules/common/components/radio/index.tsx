import { clx } from "@modules/common/components/ui"

type RadioProps = {
  checked?: boolean
  label?: string
  className?: string
  disabled?: boolean
}

export default function Radio({ checked, label, className, disabled }: RadioProps) {
  return (
    <div className={clx("flex items-center gap-3", disabled && "opacity-40", className)}>
      <div
        className={clx(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-[160ms] ease-out",
          checked
            ? "border-primary bg-primary"
            : "border-outline-variant hover:border-outline"
        )}
      >
        {checked && <div className="w-2 h-2 rounded-full bg-on-primary" />}
      </div>
      {label && <span className="text-body-md text-on-surface">{label}</span>}
    </div>
  )
}
