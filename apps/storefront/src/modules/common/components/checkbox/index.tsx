import { clx } from "@modules/common/components/ui"
import Icon from "@modules/common/components/icon"

type CheckboxProps = {
  checked?: boolean
  indeterminate?: boolean
  label?: string
  className?: string
  disabled?: boolean
  onChange?: (checked: boolean) => void
  name?: string
}

export default function Checkbox({
  checked,
  indeterminate,
  label,
  className,
  disabled,
  onChange,
  name,
}: CheckboxProps) {
  return (
    <label
      className={clx(
        "flex items-center gap-3 cursor-pointer",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="sr-only"
        disabled={disabled}
      />
      <div
        className={clx(
          "w-5 h-5 rounded flex items-center justify-center border-2 transition-all duration-[160ms] ease-out",
          checked || indeterminate
            ? "border-primary bg-primary"
            : "border-outline-variant hover:border-outline"
        )}
      >
        {checked && <Icon name="check" size={14} className="text-on-primary" />}
        {indeterminate && !checked && (
          <div className="w-2.5 h-0.5 bg-on-primary rounded-full" />
        )}
      </div>
      {label && <span className="text-body-md text-on-surface">{label}</span>}
    </label>
  )
}
