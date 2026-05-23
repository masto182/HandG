"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { WishlistProvider } from "@modules/wishlist/context"
import { LikesProvider } from "@modules/likes/context"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <LikesProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </LikesProvider>
    </QueryClientProvider>
  )
}
