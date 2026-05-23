"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  'data-testid'?: string
  canSeePricing?: boolean
}

const RefinementList = ({ sortBy, 'data-testid': dataTestId, canSeePricing }: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setQueryParams = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(name, value)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  return (
    <SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} canSeePricing={canSeePricing} />
  )
}

export default RefinementList
