// Next.js instrumentation — runs once when the server starts
// Used to initialise background workers (pg-boss queue processor)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorker } = await import("@/lib/worker");
    await startWorker();
  }
}
