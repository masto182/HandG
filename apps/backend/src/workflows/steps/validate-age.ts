import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

type ValidateAgeInput = {
  date_of_birth: string
}

export const validateAgeStep = createStep(
  "validate-age",
  async (input: ValidateAgeInput) => {
    const dob = new Date(input.date_of_birth)
    if (isNaN(dob.getTime())) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid date of birth format"
      )
    }

    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }

    if (age < 18) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "You must be 18 or older to register"
      )
    }

    return new StepResponse({ age, date_of_birth: input.date_of_birth })
  }
)
