"use client"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/common/components/icon"

type StepLayoutProps = {
  heading: string
  subtext: string
  backHref?: string
  backLabel?: string
  children: React.ReactNode
  continueLabel?: string
  onContinue?: () => void
  continueDisabled?: boolean
  continueLoading?: boolean
  showContinue?: boolean
}

const StepLayout: React.FC<StepLayoutProps> = ({
  heading,
  subtext,
  backHref,
  backLabel = "Back",
  children,
  continueLabel = "Continue",
  onContinue,
  continueDisabled = false,
  continueLoading = false,
  showContinue = true,
}) => {
  return (
    <div className="flex flex-col gap-y-8">
      <div>
        <h1 className="text-h2 text-on-surface">{heading}</h1>
        <p className="text-body-md text-on-surface-variant mt-1">{subtext}</p>
      </div>

      <div className="flex-1">{children}</div>

      <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
        {backHref ? (
          <LocalizedClientLink href={backHref} className="text-body-sm text-on-surface-variant hover:text-on-surface flex items-center gap-x-1 transition-colors">
            <Icon name="arrow_back" size={16} />
            {backLabel}
          </LocalizedClientLink>
        ) : (
          <div />
        )}
        {showContinue && (
          <button
            onClick={onContinue}
            disabled={continueDisabled || continueLoading}
            className="bg-primary text-on-primary font-bold px-8 py-3 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
          >
            {continueLoading ? (
              <Icon name="progress_activity" size={18} className="animate-spin" />
            ) : (
              <>
                {continueLabel}
                <Icon name="arrow_forward" size={18} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default StepLayout
