"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@lib/config"

export function useBreweries() {
  return useQuery({
    queryKey: ["breweries"],
    queryFn: () =>
      sdk.client
        .fetch<{ breweries: any[] }>("/store/breweries", { method: "GET" })
        .then((d) => d.breweries || []),
    staleTime: 60 * 1000,
  })
}

export function useBrewery(slug: string) {
  return useQuery({
    queryKey: ["brewery", slug],
    queryFn: () =>
      sdk.client
        .fetch<{ brewery: any }>(`/store/breweries/${slug}`, { method: "GET" })
        .then((d) => d.brewery || null),
    enabled: !!slug,
    staleTime: 60 * 1000,
  })
}

export function useSearch(q: string, filters?: Record<string, string>) {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value)
    }
  }
  const queryString = params.toString()

  return useQuery({
    queryKey: ["search", q, filters],
    queryFn: () =>
      sdk.client
        .fetch<{ hits: any[]; facetDistribution?: any }>(`/store/search?${queryString}`, { method: "GET" })
        .then((d) => d),
    enabled: !!q,
    staleTime: 30 * 1000,
  })
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () =>
      sdk.client
        .fetch<{ announcements: any[] }>("/store/announcements", { method: "GET" })
        .then((d) => d.announcements || []),
    staleTime: 5 * 60 * 1000,
  })
}

export function useVipStatus() {
  return useQuery({
    queryKey: ["vip", "status"],
    queryFn: () => sdk.client.fetch<any>("/store/customers/me/vip", { method: "GET" }),
    staleTime: 30 * 1000,
  })
}

export function useMembership() {
  return useQuery({
    queryKey: ["membership"],
    queryFn: () => sdk.client.fetch<any>("/store/customers/me/membership", { method: "GET" }),
    staleTime: 60 * 1000,
  })
}

export function useRestockAlerts() {
  return useQuery({
    queryKey: ["restock-alerts"],
    queryFn: () =>
      sdk.client
        .fetch<{ restock_alerts: any[] }>("/store/customers/me/restock-alerts", { method: "GET" })
        .then((d) => d.restock_alerts || []),
    staleTime: 30 * 1000,
  })
}

export function useToggleWishlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      remove,
    }: {
      productId: string
      remove?: boolean
    }) => {
      if (remove) {
        return sdk.client.fetch("/store/customers/me/wishlist", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: { product_id: productId },
        })
      }
      return sdk.client.fetch("/store/customers/me/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { product_id: productId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] })
    },
  })
}

export function useToggleLike() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) =>
      sdk.client.fetch(`/store/products/${productId}/likes`, { method: "POST" }),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ["likes", productId] })
      queryClient.invalidateQueries({ queryKey: ["likes"] })
    },
  })
}

export function useCreateRestockAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { product_id?: string; beer_name: string; brewery_name: string }) =>
      sdk.client.fetch("/store/customers/me/restock-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restock-alerts"] })
    },
  })
}

export function useDeleteRestockAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/store/customers/me/restock-alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restock-alerts"] })
    },
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      sdk.client.fetch("/store/customers/me/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { ids },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}
