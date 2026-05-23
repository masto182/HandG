import React from "react"
import { render, screen } from "@testing-library/react"
import TierLadder, { TierLadderEntry } from "./index"

const TIERS: TierLadderEntry[] = [
  { key: "approved", label: "Approved", points: "Entry", perk: "Standard Archives" },
  { key: "vip1", label: "VIP1", points: "100 pts", perk: "Member-Only Store" },
  { key: "vip2", label: "VIP2", points: "250 pts", perk: "6h Early Access" },
  { key: "vip3", label: "VIP3", points: "450 pts", perk: "12h Early Access" },
  { key: "vip4", label: "VIP4", points: "700 pts", perk: "1d Priority Access" },
  { key: "vip5", label: "VIP5", points: "1000 pts", perk: "2d Priority Access" },
]

describe("TierLadder", () => {
  it("marks the current tier as 'current' and the next as 'next'", () => {
    render(<TierLadder tiers={TIERS} currentTier="vip2" />)
    expect(screen.getByTestId("tier-row-vip2")).toHaveAttribute("data-state", "current")
    expect(screen.getByTestId("tier-row-vip3")).toHaveAttribute("data-state", "next")
    expect(screen.getByTestId("tier-current-vip2")).toBeInTheDocument()
    expect(screen.getByTestId("tier-next-vip3")).toBeInTheDocument()
  })

  it("marks tiers below current as 'below'", () => {
    render(<TierLadder tiers={TIERS} currentTier="vip3" />)
    expect(screen.getByTestId("tier-row-approved")).toHaveAttribute("data-state", "below")
    expect(screen.getByTestId("tier-row-vip1")).toHaveAttribute("data-state", "below")
    expect(screen.getByTestId("tier-row-vip2")).toHaveAttribute("data-state", "below")
  })

  it("marks tiers above next as 'future'", () => {
    render(<TierLadder tiers={TIERS} currentTier="vip1" />)
    expect(screen.getByTestId("tier-row-vip3")).toHaveAttribute("data-state", "future")
    expect(screen.getByTestId("tier-row-vip4")).toHaveAttribute("data-state", "future")
    expect(screen.getByTestId("tier-row-vip5")).toHaveAttribute("data-state", "future")
  })

  it("renders perk text from the tier metadata", () => {
    render(<TierLadder tiers={TIERS} currentTier="approved" />)
    expect(screen.getByTestId("tier-perk-vip3")).toHaveTextContent("12h Early Access")
    expect(screen.getByTestId("tier-perk-vip5")).toHaveTextContent("2d Priority Access")
  })

  it("when at vip5 there is no 'next' tier", () => {
    render(<TierLadder tiers={TIERS} currentTier="vip5" />)
    expect(screen.getByTestId("tier-row-vip5")).toHaveAttribute("data-state", "current")
    // No tier-next-* should be rendered
    expect(screen.queryByText("NEXT LEVEL")).not.toBeInTheDocument()
  })
})
