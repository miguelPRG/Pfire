export async function httpRequest<TData>(url: string, init?: RequestInit): Promise<TData> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
  });

  const hasHeaderReader = typeof response.headers?.get === "function";
  const contentType = response.headers?.get?.("content-type") || "";
  const canReadJson = typeof response.json === "function";
  const isJson = contentType.includes("application/json") || (!hasHeaderReader && canReadJson);
  const payload = isJson ? await response.json().catch(() => ({})) : await response.text().catch(() => "");

  if (!response.ok) {
    if (typeof payload === "object" && payload !== null) {
      const p = payload as Record<string, unknown>;
      throw new Error((p.detail as string) || (p.message as string) || "Erro na comunicação com o servidor.");
    }
    throw new Error(typeof payload === "string" && payload ? payload : "Erro na comunicação com o servidor.");
  }

  return payload as TData;
}
