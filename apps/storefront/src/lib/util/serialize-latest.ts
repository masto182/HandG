/**
 * createLatestSerializer
 *
 * Serializes async tasks so they run strictly in submission order (each waits
 * for the previous to settle) AND skips any task that has been superseded by a
 * newer submission before it gets to run. Only the most-recently submitted task
 * actually executes once the queue drains.
 *
 * Used by the checkout shipping step: rapid rate clicks / signature toggles each
 * POST to the cart, and we need (a) the cart to end on the LAST-clicked rate
 * (not whichever network response happens to land last), and (b) to avoid firing
 * intermediate writes that are already stale.
 *
 * The task receives an `isLatest()` predicate so side effects that should only
 * happen for the winning task (e.g. a router refresh or error display) can be
 * gated.
 */
export function createLatestSerializer() {
  let seq = 0
  let inflight: Promise<void> = Promise.resolve()

  return function run(
    task: (isLatest: () => boolean) => Promise<void>,
  ): Promise<void> {
    const mySeq = ++seq
    const prev = inflight
    const p = (async () => {
      // Wait for the previous task to settle so apply-order === submit-order.
      await prev.catch(() => {})
      // A newer task was submitted while we waited — skip this stale one.
      if (mySeq !== seq) return
      await task(() => mySeq === seq)
    })()
    inflight = p
    return p
  }
}

export type LatestSerializer = ReturnType<typeof createLatestSerializer>
