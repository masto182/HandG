import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReferralData } from "@lib/data/referrals"
import ReferralsPage from "./referrals-client"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))
jest.mock("@lib/data/referrals", () => ({ getReferralData: jest.fn() }))
jest.mock("@lib/data/onboarding", () => ({
  completeOnboardingStep: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@lib/util/plausible", () => ({ trackGoal: jest.fn() }))

const inviteLink = "https://hopsandglory.au/apply?ref=BEER123"
const invitation =
  "I'd like to invite you to apply for Hops & Glory membership."

const referralData: ReferralData = {
  referral_code: "BEER123",
  invite_link: inviteLink,
  stats: {
    total_referrals: 0,
    rewarded_referrals: 0,
    network_contribution: 0,
    contribution_value: 25,
    growth_last_month: 0,
  },
  history: [],
  total_history_count: 0,
  stealth_mode: false,
}

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia")
const originalSecureContext = Object.getOwnPropertyDescriptor(
  window,
  "isSecureContext",
)
const originalOpen = Object.getOwnPropertyDescriptor(window, "open")
const originalShare = Object.getOwnPropertyDescriptor(navigator, "share")
const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
)

function restoreProperty(
  target: object,
  property: string,
  descriptor?: PropertyDescriptor,
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    Reflect.deleteProperty(target, property)
  }
}

function setViewport(isMobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn().mockReturnValue({
      matches: isMobile,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  })
}

function taggedLink(medium: string) {
  const link = new URL(inviteLink)
  link.searchParams.set("utm_source", "referral")
  link.searchParams.set("utm_medium", medium)
  link.searchParams.set("utm_campaign", "member_invite")
  return link.toString()
}

afterEach(() => {
  restoreProperty(window, "matchMedia", originalMatchMedia)
  restoreProperty(window, "isSecureContext", originalSecureContext)
  restoreProperty(window, "open", originalOpen)
  restoreProperty(navigator, "share", originalShare)
  restoreProperty(navigator, "clipboard", originalClipboard)
})

describe("referral invitations", () => {
  it("sends a neutral invitation through native sharing", async () => {
    setViewport(true)
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    })
    const share = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    })

    render(<ReferralsPage initialData={referralData} />)
    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: "An invite to Hops & Glory",
        text: invitation,
        url: taggedLink("share"),
      }),
    )
  })

  it.each([
    { name: "X / Twitter", channel: "twitter" },
    { name: "Email", channel: "email" },
  ])("uses the neutral invitation for $name", ({ name, channel }) => {
    setViewport(false)
    const open = jest.fn().mockReturnValue({})
    Object.defineProperty(window, "open", { configurable: true, value: open })

    render(<ReferralsPage initialData={referralData} />)
    fireEvent.click(screen.getByRole("button", { name }))

    expect(open).toHaveBeenCalledTimes(1)
    const url = new URL(open.mock.calls[0][0])
    if (channel === "twitter") {
      expect(url.searchParams.get("text")).toBe(invitation)
      expect(url.searchParams.get("url")).toBe(taggedLink(channel))
    } else {
      expect(url.searchParams.get("subject")).toBe("An invite to Hops & Glory")
      expect(url.searchParams.get("body")).toBe(
        `${invitation} ${taggedLink(channel)}`,
      )
    }
  })

  it("shares only the referral link with Facebook", () => {
    setViewport(false)
    const open = jest.fn().mockReturnValue({})
    Object.defineProperty(window, "open", { configurable: true, value: open })

    render(<ReferralsPage initialData={referralData} />)
    fireEvent.click(screen.getByRole("button", { name: "Facebook" }))

    const url = new URL(open.mock.calls[0][0])
    expect(url.searchParams.get("u")).toBe(taggedLink("facebook"))
    expect(url.searchParams.get("text")).toBeNull()
  })

  it("copies the neutral invitation when native sharing is unavailable", async () => {
    setViewport(true)
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false,
    })
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    render(<ReferralsPage initialData={referralData} />)
    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `${invitation} ${taggedLink("share")}`,
      ),
    )
  })

  it("copies the neutral invitation when a channel popup is blocked", async () => {
    setViewport(false)
    Object.defineProperty(window, "open", {
      configurable: true,
      value: jest.fn().mockReturnValue(null),
    })
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    render(<ReferralsPage initialData={referralData} />)
    fireEvent.click(screen.getByRole("button", { name: "Email" }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `${invitation} ${taggedLink("email")}`,
      ),
    )
  })

  it("shows no dollar-valued rewards on the active referral page", () => {
    setViewport(false)
    render(<ReferralsPage initialData={referralData} />)

    expect(screen.getByText("0 points")).toBeInTheDocument()
    expect(screen.getByTestId("referrals-page-wrapper")).not.toHaveTextContent(
      /\$|credit/i,
    )
  })

  it("shows an honest unavailable state instead of placeholder rewards", () => {
    setViewport(false)
    render(
      <ReferralsPage
        initialData={{
          ...referralData,
          referral_code: null,
          invite_link: null,
        }}
      />,
    )

    expect(
      screen.getByRole("heading", {
        name: "Your referral link isn't available yet.",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Please contact us if you need help with your referral link.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByTestId("referrals-page-wrapper")).not.toHaveTextContent(
      /\$|credit|3 more|first box|5 referrals/i,
    )
  })
})
