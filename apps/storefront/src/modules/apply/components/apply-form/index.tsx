"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { sdk } from "@lib/config"
import { trackGoal } from "@lib/util/plausible"

export default function ApplyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralFromUrl = searchParams.get("ref") || ""

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string
    const profile = {
      email,
      first_name: form.get("first_name") as string,
      last_name: form.get("last_name") as string,
      date_of_birth: form.get("date_of_birth") as string,
      why_join: form.get("why_join") as string,
      favourite_brewery: form.get("favourite_brewery") as string,
      referral_code: (form.get("referral_code") as string) || undefined,
      untappd_id: (form.get("untappd_id") as string) || undefined,
    }

    const today = new Date()
    const dob = new Date(profile.date_of_birth)
    const age = today.getFullYear() - dob.getFullYear()
    if (age < 18) {
      setError("You must be at least 18 years old to apply.")
      setLoading(false)
      return
    }

    try {
      // Step 1: create the auth identity (Medusa's emailpass register).
      // This returns a registration JWT scoped to the new identity.
      const registrationToken = (await sdk.auth.register("customer", "emailpass", {
        email,
        password,
      })) as string

      // Step 2: submit the applicant profile with the registration JWT
      await sdk.client.fetch("/store/customers/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${registrationToken}`,
        },
        body: profile,
      })

      router.push("/apply/pending")
      trackGoal("application_submitted", {
        has_referral: !!profile.referral_code,
      })
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-y-4 w-full max-w-md">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hg-text-secondary">First name</label>
          <input
            name="first_name"
            required
            className="bg-hg-surface border border-hg-border rounded-lg px-4 py-2.5 text-sm text-hg-text focus:border-hg-gold focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hg-text-secondary">Last name</label>
          <input
            name="last_name"
            required
            className="bg-hg-surface border border-hg-border rounded-lg px-4 py-2.5 text-sm text-hg-text focus:border-hg-gold focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-hg-text-secondary">Email</label>
        <input
          name="email"
          type="email"
          required
          className="bg-hg-surface border border-hg-border rounded-lg px-4 py-2.5 text-sm text-hg-text focus:border-hg-gold focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-hg-text-secondary">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="bg-hg-surface border border-hg-border rounded-lg px-4 py-2.5 text-sm text-hg-text focus:border-hg-gold focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-hg-text-secondary">Date of birth</label>
        <input
          name="date_of_birth"
          type="date"
          required
          className="bg-hg-surface border border-hg-border rounded-lg px-4 py-2.5 text-sm text-hg-text focus:border-hg-gold focus:outline-none"
        />
        <span className="text-xs text-hg-text-secondary/60">You must be 18 or older</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-hg-text-secondary">Why do you want to join?</label>
        <textarea
          name="why_join"
          required
          rows={3}
          placeholder="Tell us about your interest in collecting..."
          className="bg-hg-surface border border-hg-border rounded-lg px-4 py-2.5 text-sm text-hg-text focus:border-hg-gold focus:outline-none resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-hg-text-secondary">Favourite producer or source</label>
        <input
          name="favourite_brewery"
          required
          placeholder="Your go-to sources"
          className="bg-hg-surface border border-hg-border rounded-lg px-4 py-2.5 text-sm text-hg-text focus:border-hg-gold focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-hg-text-secondary">Referral code (optional)</label>
        <input
          name="referral_code"
          defaultValue={referralFromUrl}
          placeholder="Enter a member referral code"
          className="bg-hg-surface border border-hg-border rounded-lg px-4 py-2.5 text-sm text-hg-text focus:border-hg-gold focus:outline-none"
        />
      </div>



      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 px-8 py-3 bg-hg-gold hover:bg-hg-gold-hover text-hg-bg font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  )
}
