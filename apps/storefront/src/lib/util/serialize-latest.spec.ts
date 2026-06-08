import { createLatestSerializer } from "./serialize-latest"

// Small controllable deferred for ordering tests.
function deferred<T = void>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// Flush pending microtasks (the serializer body runs on the microtask queue).
const tick = () => new Promise((r) => setTimeout(r, 0))

describe("createLatestSerializer", () => {
  it("runs a single task and reports it as latest", async () => {
    const run = createLatestSerializer()
    const seen: boolean[] = []
    await run(async (isLatest) => {
      seen.push(isLatest())
    })
    expect(seen).toEqual([true])
  })

  it("collapses a synchronous burst to only the latest submission", async () => {
    // Three rapid clicks before any has a chance to run: only the last fires.
    const run = createLatestSerializer()
    const executed: string[] = []
    const pA = run(async () => {
      executed.push("A")
    })
    const pB = run(async () => {
      executed.push("B")
    })
    const pC = run(async () => {
      executed.push("C")
    })
    await Promise.all([pA, pB, pC])
    expect(executed).toEqual(["C"])
  })

  it("serializes tasks submitted while a prior one is in flight (apply order == submit order)", async () => {
    const run = createLatestSerializer()
    const order: string[] = []
    const dA = deferred()
    const dB = deferred()

    const pA = run(async () => {
      order.push("A:start")
      await dA.promise
      order.push("A:end")
    })
    // Let A get past its supersede-check and into flight before submitting B.
    await tick()
    const pB = run(async () => {
      order.push("B:start")
      await dB.promise
      order.push("B:end")
    })

    // B must not start until A has fully settled.
    await tick()
    expect(order).toEqual(["A:start"])
    dA.resolve()
    await pA
    await tick()
    expect(order).toEqual(["A:start", "A:end", "B:start"])
    dB.resolve()
    await pB
    expect(order).toEqual(["A:start", "A:end", "B:start", "B:end"])
  })

  it("skips superseded intermediate tasks — the in-flight one and the latest run", async () => {
    const run = createLatestSerializer()
    const dA = deferred()
    const executed: string[] = []

    // A starts and blocks (in flight). B and C are queued behind it.
    const pA = run(async () => {
      executed.push("A")
      await dA.promise
    })
    await tick() // A is now in flight
    const pB = run(async () => {
      executed.push("B")
    })
    const pC = run(async () => {
      executed.push("C")
    })

    dA.resolve()
    await Promise.all([pA, pB, pC])

    // A already ran; B was superseded by C and skipped; C ran last.
    expect(executed).toEqual(["A", "C"])
  })

  it("marks a superseded in-flight task as not latest", async () => {
    const run = createLatestSerializer()
    const dA = deferred()
    const latestFlags: Record<string, boolean> = {}

    const pA = run(async (isLatest) => {
      await dA.promise
      latestFlags.A = isLatest()
    })
    await tick() // A in flight, awaiting dA
    const pC = run(async (isLatest) => {
      latestFlags.C = isLatest()
    })

    dA.resolve()
    await Promise.all([pA, pC])

    expect(latestFlags.A).toBe(false) // superseded by C
    expect(latestFlags.C).toBe(true)
  })

  it("does not let a rejected task break the queue", async () => {
    const run = createLatestSerializer()
    const executed: string[] = []

    const pA = run(async () => {
      executed.push("A")
      throw new Error("boom")
    })
    pA.catch(() => {}) // caller handles its own rejection (the component self-catches)
    await tick() // A in flight
    const pB = run(async () => {
      executed.push("B")
    })

    // The serializer swallows the prior rejection; subsequent tasks still run.
    await Promise.allSettled([pA, pB])
    expect(executed).toEqual(["A", "B"])
  })
})
