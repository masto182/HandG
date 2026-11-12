"use client"

type OptionalFieldProps = {
  open: boolean
  addLabel: string
  onOpen: () => void
  onClose: () => void
  testId: string
  children: React.ReactNode
}

export default function OptionalField({
  open,
  addLabel,
  onOpen,
  onClose,
  testId,
  children,
}: OptionalFieldProps) {
  const linkClass =
    "text-sm text-on-surface-variant underline underline-offset-2 hover:text-on-surface"

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`self-start ${linkClass}`}
        data-testid={`add-${testId}`}
      >
        + {addLabel}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {children}
      <button
        type="button"
        onClick={onClose}
        className={`self-end text-xs ${linkClass}`}
        data-testid={`remove-${testId}`}
      >
        Remove
      </button>
    </div>
  )
}
