"""Lab 04 - Parallel vs sequential agent calls with asyncio (and why distributed is different).

Run: python labs/lab04_parallel_vs_sequential.py
Each fake "agent" just waits, like a real LLM or ERP call that is I/O bound.
"""

import asyncio
import time


async def agent(name: str, seconds: float) -> str:
    await asyncio.sleep(seconds)  # stands in for an LLM call / HTTP request
    return f"{name} done"


async def sequential() -> list[str]:
    return [
        await agent("match", 1.0),
        await agent("risk", 1.0),
        await agent("duplicate-check", 1.0),
    ]


async def parallel() -> list[str]:
    # Independent steps -> run together. Like Promise.all in JS or CompletableFuture.allOf in Java.
    return await asyncio.gather(
        agent("match", 1.0), agent("risk", 1.0), agent("duplicate-check", 1.0)
    )


async def bounded_batch(n_invoices: int, limit: int) -> None:
    # A semaphore caps concurrency: protects the ERP, your rate limits and your token budget.
    sem = asyncio.Semaphore(limit)

    async def one(i: int) -> str:
        async with sem:
            return await agent(f"invoice-{i}", 0.5)

    t = time.perf_counter()
    await asyncio.gather(*(one(i) for i in range(n_invoices)))
    print(f"batch of {n_invoices} with limit {limit}: {time.perf_counter() - t:.1f}s")


async def main() -> None:
    t = time.perf_counter()
    await sequential()
    print(f"sequential: {time.perf_counter() - t:.1f}s")
    t = time.perf_counter()
    await parallel()
    print(f"parallel:   {time.perf_counter() - t:.1f}s")
    await bounded_batch(12, limit=4)
    print("\nParallel = many tasks in ONE process (asyncio).")
    print(
        "Distributed = tasks on MANY machines/replicas, coordinated by a queue (e.g. Azure Service Bus +"
    )
    print(
        "Container Apps scaling on queue length). It needs idempotency: the same invoice may arrive twice."
    )


if __name__ == "__main__":
    asyncio.run(main())
