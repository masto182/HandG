import Icon from "@modules/common/components/icon"
import { clx } from "@modules/common/components/ui"
import {
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

export type NativeSelectProps = {
  placeholder?: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
  label?: string
  error?: string
  helperText?: string
} & SelectHTMLAttributes<HTMLSelectElement>

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    { placeholder = "Select...", defaultValue, className, children, label, error, helperText, disabled, ...props },
    ref
  ) => {
    const innerRef = useRef<HTMLSelectElement>(null)
    const [isPlaceholder, setIsPlaceholder] = useState(false)

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    )

    useEffect(() => {
      if (innerRef.current && innerRef.current.value === "") {
        setIsPlaceholder(true)
      } else {
        setIsPlaceholder(false)
      }
    }, [innerRef.current?.value])

    const hasError = !!error

    return (
      <div className={clx("flex flex-col w-full gap-1.5", className)}>
        {label && (
          <label className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={innerRef}
            defaultValue={defaultValue}
            disabled={disabled}
            className={clx(
              "block w-full h-12 px-4 pr-10 bg-surface-container-lowest border-none rounded-xl text-body-md appearance-none",
              "transition-all duration-[160ms] ease-out",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0",
              "disabled:opacity-40 disabled:pointer-events-none",
              isPlaceholder ? "text-on-surface-variant" : "text-on-surface",
              hasError && "ring-1 ring-error/20"
            )}
            onChange={(e) => {
              setIsPlaceholder(e.target.value === "")
              props.onChange?.(e)
            }}
            {...props}
          >
            <option disabled value="">
              {placeholder}
            </option>
            {children}
          </select>
          <Icon
            name="expand_more"
            size={20}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
        </div>
        {(helperText || error) && (
          <p className={clx("text-body-sm", hasError ? "text-error" : "text-on-surface-variant")}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

NativeSelect.displayName = "NativeSelect"

export default NativeSelect
