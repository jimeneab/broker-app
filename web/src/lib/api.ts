import { z } from "zod";
import { publicEnv } from "./env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  /** Supabase access_token */
  token?: string | null;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Sent as JSON */
  body?: unknown;
  signal?: AbortSignal;
};

const errorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

export async function request<T>(path: string, schema: z.ZodType<T>, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the API");
  }

  const body: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined);

  if (!res.ok) {
    const parsedError = errorSchema.safeParse(body);
    if (parsedError.success) {
      throw new ApiError(res.status, parsedError.data.error.code, parsedError.data.error.message);
    }
    throw new ApiError(res.status, "UNKNOWN_ERROR", `Unexpected API response (HTTP ${res.status})`);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(res.status, "INVALID_RESPONSE", "The API response has an unexpected shape");
  return parsed.data;
}

const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  riskScore: z.number().int().nullable(),
  riskProfile: z.enum(["conservador", "moderado", "agresivo"]).nullable(),
  onboardedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Me = z.infer<typeof meSchema>;

/** Typed endpoints. Each feature adds its own here. */
export const api = {
  health: (opts?: RequestOptions) => request("/health", z.object({ status: z.literal("ok") }), opts),
  me: (opts?: RequestOptions) => request("/me", meSchema, opts),
  saveRiskProfile: (answers: number[], opts?: Omit<RequestOptions, "method" | "body">) =>
    request("/me/risk-profile", meSchema, { ...opts, method: "PUT", body: { answers } }),
};

const messages: Record<string, string> = {
  PROVIDER_RATE_LIMITED: "Demasiadas solicitudes al proveedor de datos. Intenta de nuevo en un minuto.",
  PROVIDER_ERROR: "El proveedor de datos no respondió correctamente.",
  NETWORK_ERROR: "No se pudo conectar con el servidor.",
  UNAUTHORIZED: "Tu sesión expiró. Inicia sesión de nuevo.",
  PROFILE_NOT_FOUND: "No encontramos tu perfil.",
  VALIDATION_ERROR: "Revisa tus respuestas e intenta de nuevo.",
};

/** UI message in Spanish for an ApiError code. */
export function errorMessage(err: unknown): string {
  return (err instanceof ApiError && messages[err.code]) || "Algo salió mal. Intenta de nuevo.";
}
