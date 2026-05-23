export function breweryLabel(isApproved: boolean, plural = true): string {
  if (isApproved) return plural ? "Breweries" : "Brewery"
  return plural ? "Producers" : "Producer"
}
