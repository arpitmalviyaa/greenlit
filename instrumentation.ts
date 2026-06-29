export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      console.error("greenlit_unhandled_rejection", {
        error_id: globalThis.crypto.randomUUID(),
        message: reason instanceof Error ? reason.message : "unknown rejection",
      });
    });

    process.on("uncaughtException", (error) => {
      console.error("greenlit_uncaught_exception", {
        error_id: globalThis.crypto.randomUUID(),
        message: error.message,
      });
    });
  }
}
