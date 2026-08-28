export function ok(data: unknown) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text" as const, text }] };
}

export function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

export async function guarded<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(error);
  }
}
