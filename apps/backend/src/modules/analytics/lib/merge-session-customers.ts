/**
 * Query-time anonymous-session -> customer attribution.
 *
 * The hg_sid cookie persists across login/logout, so a session's pre-login
 * events (customer_id = null) and post-login events (customer_id set) share the
 * same session_id. This builds a session_id -> customer_id map from the rows in
 * a set that DO have a customer_id, then attributes the anonymous rows in those
 * same sessions. Non-destructive: it never mutates stored rows.
 *
 * Sessions associated with multiple customer_ids are left unattributed so a
 * shared browser cannot assign anonymous activity to the wrong member.
 */

export interface MergeableEvent {
  session_id: string | null
  customer_id: string | null
  created_at?: string | Date | null
}

/** Build session_id -> customer_id only for unambiguous sessions. */
export function sessionToCustomerMap(events: MergeableEvent[]): Map<string, string> {
  const map = new Map<string, string>()
  const ambiguous = new Set<string>()
  for (const e of events) {
    if (!e.session_id || !e.customer_id) continue
    if (ambiguous.has(e.session_id)) continue
    const prior = map.get(e.session_id)
    if (!prior) {
      map.set(e.session_id, e.customer_id)
      continue
    }
    if (prior !== e.customer_id) {
      map.delete(e.session_id)
      ambiguous.add(e.session_id)
    }
  }
  return map
}

/**
 * Return the events with customer_id filled in for anonymous rows in sessions
 * that have attribution evidence. Does not mutate the input array.
 */
export function mergeSessionCustomers<T extends MergeableEvent>(events: T[]): T[] {
  const map = sessionToCustomerMap(events)
  if (map.size === 0) return events
  return events.map((e) => {
    if (e.customer_id) return e
    const resolved = e.session_id ? map.get(e.session_id) : undefined
    return resolved ? { ...e, customer_id: resolved } : e
  })
}
