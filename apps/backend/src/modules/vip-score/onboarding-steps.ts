export const ONBOARDING_STEPS: Record<
  string,
  { label: string; points: number; section: string; description: string }
> = {
  browse_hops: {
    label: "Browse the Hops Directory",
    points: 5,
    section: "discover",
    description: "Explore hop varieties — origin, flavour profile, and farm notes.",
  },
  browse_breweries: {
    label: "Browse the Breweries Directory",
    points: 5,
    section: "discover",
    description: "See all the breweries we carry and what they're known for.",
  },
  hop_alert: {
    label: "Subscribe to a Hop",
    points: 15,
    section: "notifications",
    description: "Get notified every time a new beer using your favourite hop is listed.",
  },
  brewery_follow: {
    label: "Follow a Brewery",
    points: 15,
    section: "notifications",
    description: "Be first to hear about new drops from a brewery you love.",
  },
  wishlist_add: {
    label: "Add a Beer to Your Wishlist",
    points: 10,
    section: "wishlist",
    description: "Save beers you're watching — with filters for alerts.",
  },
  price_alert: {
    label: "Set a Price Alert",
    points: 10,
    section: "wishlist",
    description: "Set a target price on a wishlist item. We'll email you if it drops.",
  },
  stock_alert: {
    label: "Set a Stock Threshold Alert",
    points: 10,
    section: "wishlist",
    description: "Get warned when fewer than N of a limited beer remain.",
  },
  address_added: {
    label: "Add Your Delivery Address",
    points: 10,
    section: "account",
    description: "Add an address so we know where to ship your orders.",
  },
  vip_view: {
    label: "Check Your VIP Score",
    points: 5,
    section: "loyalty",
    description: "See your tier, breakdown, and what perks you unlock next.",
  },
  referral_view: {
    label: "Copy Your Referral Code",
    points: 5,
    section: "loyalty",
    description: "Share your code — earn VIP points every time a referral buys.",
  },
  email_prefs: {
    label: "Save Email Preferences",
    points: 10,
    section: "account",
    description: "Choose exactly which alerts land in your inbox.",
  },
}

export const MAX_ONBOARDING_POINTS = Object.values(ONBOARDING_STEPS).reduce(
  (sum, s) => sum + s.points,
  0
)
