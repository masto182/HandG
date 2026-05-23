"use server"

export type Locale = {
  code: string
  name: string
}

export const listLocales = async (): Promise<Locale[] | null> => {
  return null
}
