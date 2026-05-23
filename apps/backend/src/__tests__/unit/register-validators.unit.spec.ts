import { RegisterCustomerSchema } from "../../api/store/customers/register/validators"

const valid = {
  email: "test@example.com",
  first_name: "Alice",
  last_name: "Smith",
  date_of_birth: "1990-05-12",
  why_join: "I love beer",
  favourite_brewery: "Lolev",
}

describe("RegisterCustomerSchema", () => {
  it("accepts a valid payload", () => {
    const r = RegisterCustomerSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })

  it("strips HTML from why_join via transform", () => {
    const r = RegisterCustomerSchema.safeParse({
      ...valid,
      why_join: "<script>alert(1)</script>I really like hops",
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.why_join).toBe("I really like hops")
      expect(r.data.why_join).not.toContain("<")
    }
  })

  it("strips HTML from favourite_brewery", () => {
    const r = RegisterCustomerSchema.safeParse({
      ...valid,
      favourite_brewery: "<b>Lolev</b>",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.favourite_brewery).toBe("Lolev")
  })

  it("rejects oversize why_join", () => {
    const r = RegisterCustomerSchema.safeParse({
      ...valid,
      why_join: "x".repeat(5000),
    })
    expect(r.success).toBe(false)
  })

  it("rejects invalid email", () => {
    const r = RegisterCustomerSchema.safeParse({ ...valid, email: "not-an-email" })
    expect(r.success).toBe(false)
  })

  it("rejects malformed DOB", () => {
    const r = RegisterCustomerSchema.safeParse({ ...valid, date_of_birth: "12/05/1990" })
    expect(r.success).toBe(false)
  })

  it("rejects referral_code with spaces", () => {
    const r = RegisterCustomerSchema.safeParse({
      ...valid,
      referral_code: "bad code",
    })
    expect(r.success).toBe(false)
  })

  it("accepts well-formed referral_code", () => {
    const r = RegisterCustomerSchema.safeParse({
      ...valid,
      referral_code: "ABCD-1234",
    })
    expect(r.success).toBe(true)
  })

  it("rejects untappd_id with @ symbol", () => {
    const r = RegisterCustomerSchema.safeParse({
      ...valid,
      untappd_id: "user@host",
    })
    expect(r.success).toBe(false)
  })

  it("collapses whitespace in first_name", () => {
    const r = RegisterCustomerSchema.safeParse({ ...valid, first_name: "  Bob   " })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.first_name).toBe("Bob")
  })
})
