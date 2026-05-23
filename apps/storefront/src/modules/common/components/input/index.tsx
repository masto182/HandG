"use client"

import React, { useEffect, useImperativeHandle, useState } from "react"
import Icon from "@modules/common/components/icon"
import { clx } from "@modules/common/components/ui"

type InputProps = Omit<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  "placeholder"
> & {
  label: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
  name: string
  topLabel?: string
  helperText?: string
  error?: string
  trailingIcon?: string
  onTrailingIconClick?: () => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type,
      name,
      label,
      touched: _touched,
      required,
      topLabel,
      helperText,
      error,
      trailingIcon,
      onTrailingIconClick,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [inputType, setInputType] = useState(type)

    useEffect(() => {
      if (type === "password" && showPassword) {
        setInputType("text")
      }
      if (type === "password" && !showPassword) {
        setInputType("password")
      }
    }, [type, showPassword])

    useImperativeHandle(ref, () => inputRef.current!)

    const hasError = !!error

    return (
      <div className={clx("flex flex-col w-full gap-1.5", className)}>
        {topLabel && (
          <label
            htmlFor={name}
            className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant"
          >
            {topLabel}
            {required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            type={inputType}
            name={name}
            id={name}
            placeholder={label}
            required={required}
            disabled={disabled}
            className={clx(
              "block w-full h-12 px-4 bg-surface-container-lowest border-none rounded-xl text-body-md text-on-surface placeholder:text-on-surface-variant",
              "transition-all duration-[160ms] ease-out",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0",
              "disabled:opacity-40 disabled:pointer-events-none",
              hasError && "ring-1 ring-error/20",
              (type === "password" || trailingIcon) && "pr-12"
            )}
            {...props}
            ref={inputRef}
          />
          {type === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icon name={showPassword ? "visibility" : "visibility_off"} size={20} />
            </button>
          )}
          {trailingIcon && type !== "password" && (
            <button
              type="button"
              onClick={onTrailingIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icon name={trailingIcon} size={20} />
            </button>
          )}
          {hasError && (
            <Icon
              name="error"
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-error"
            />
          )}
        </div>
        {(helperText || error) && (
          <p
            className={clx(
              "text-body-sm",
              hasError ? "text-error" : "text-on-surface-variant"
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
