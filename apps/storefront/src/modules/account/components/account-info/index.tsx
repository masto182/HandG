"use client"

import { clx } from "@modules/common/components/ui"
import { useEffect } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import { useFormStatus } from "react-dom"

type AccountInfoProps = {
  label: string
  currentInfo: string | React.ReactNode
  isSuccess?: boolean
  isError?: boolean
  errorMessage?: string
  clearState: () => void
  children?: React.ReactNode
  'data-testid'?: string
}

const AccountInfo = ({
  label,
  currentInfo,
  isSuccess,
  isError,
  clearState,
  errorMessage = "An error occurred, please try again",
  children,
  'data-testid': dataTestid
}: AccountInfoProps) => {
  const { state, close, toggle } = useToggleState()

  const { pending } = useFormStatus()

  const handleToggle = () => {
    clearState()
    toggle()
  }

  useEffect(() => {
    if (isSuccess) {
      close()
    }
  }, [isSuccess, close])

  return (
    <div className="text-sm px-6" data-testid={dataTestid}>
      <div className="flex items-center justify-between py-4">
        <div className="flex flex-col gap-1">
          <span className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant">{label}</span>
          <div className="flex items-center">
            {typeof currentInfo === "string" ? (
              <span className="text-on-surface" data-testid="current-info">{currentInfo === "null" ? "—" : currentInfo}</span>
            ) : (
              currentInfo
            )}
          </div>
        </div>
        <button
          type={state ? "reset" : "button"}
          onClick={handleToggle}
          className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-outline-variant rounded-lg text-on-surface-variant hover:text-on-surface hover:border-outline transition-all"
          data-testid="edit-button"
          data-active={state}
        >
          {state ? "Cancel" : "Edit"}
        </button>
      </div>

      <div
        className={clx(
          "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
          {
            "max-h-[200px] opacity-100": isSuccess,
            "max-h-0 opacity-0": !isSuccess,
          }
        )}
        data-testid="success-message"
      >
        <div className="px-3 py-2 my-2 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
          {label} updated successfully
        </div>
      </div>

      <div
        className={clx(
          "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
          {
            "max-h-[200px] opacity-100": isError,
            "max-h-0 opacity-0": !isError,
          }
        )}
        data-testid="error-message"
      >
        <div className="px-3 py-2 my-2 bg-error/10 border border-error/20 rounded-lg text-xs text-error">
          {errorMessage}
        </div>
      </div>

      <div
        className={clx(
          "transition-[max-height,opacity] duration-300 ease-in-out",
          {
            "max-h-[1000px] opacity-100 overflow-visible": state,
            "max-h-0 opacity-0 overflow-hidden pointer-events-none": !state,
          }
        )}
      >
        <div className="flex flex-col gap-y-3 py-4">
          <div>{children}</div>
          <div className="flex items-center justify-end mt-2">
            <button
              type="submit"
              disabled={pending}
              className="btn-primary text-sm !min-h-[38px] disabled:opacity-50"
              data-testid="save-button"
            >
              {pending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountInfo
