import type { RequestEvent } from "@sveltejs/kit";
import { error } from "@sveltejs/kit";
import { z, type ZodError, type ZodSchema } from "zod";
// ADD: eure gebrandete UUID & NonEmpty – für Param-Validierung
import { UUID as UUIDSchema, type UUID, NonEmpty } from "$lib/types";

/** Why: Konsistente 400-Fehler. */
export function zodErrorToResponse(e: ZodError) {
  return {
    message: "Validation failed",
    issues: e.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
  };
}

export async function readValidatedBody<T>(
  event: RequestEvent,
  schema: ZodSchema<T>
): Promise<T> {
  let raw: unknown;
  try {
    raw = await event.request.json();
  } catch {
    throw error(400, { message: "Body must be valid JSON" });
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw error(400, zodErrorToResponse(r.error));
  return r.data;
}

export function validateParams<T>(
  event: RequestEvent,
  schema: ZodSchema<T>
): T {
  const r = schema.safeParse(event.params);
  console.log(event.params);
  if (!r.success) throw error(400, zodErrorToResponse(r.error));
  return r.data;
}

export function validateQuery<T>(
  event: RequestEvent,
  schema: ZodSchema<T>
): T {
  const obj = Object.fromEntries(new URL(event.request.url).searchParams);
  const r = schema.safeParse(obj);
  if (!r.success) throw error(400, zodErrorToResponse(r.error));
  return r.data;
}

/** Optional: non-throw parse (Result) */
export function tryParse<T>(schema: ZodSchema<T>, input: unknown) {
  const r = schema.safeParse(input);
  return r.success ? ([r.data, null] as const) : ([null, r.error] as const);
}

/** ADD: Brand-sichere UUID aus params holen (WHY: UUID branding + weniger Boilerplate) */
export function validateUUIDParam(
  event: RequestEvent,
  paramName: string
): UUID {
  const value = (event.params as Record<string, string | undefined>)[paramName];
  if (!value) throw error(400, { message: `${paramName} required` });
  const r = UUIDSchema.safeParse(value);
  if (!r.success) throw error(400, { message: `${paramName} required` });
  return r.data;
}

/** ADD: Optionaler Helper für Tokens/Namen (WHY: häufiges Pattern NonEmpty) */
export function validateNonEmptyParam(
  event: RequestEvent,
  paramName: string,
  max = 120
): string {
  const S = NonEmpty.max(max);
  const value = (event.params as Record<string, string | undefined>)[paramName];
  if (!value) throw error(400, { message: `${paramName} required` });
  const r = S.safeParse(value);
  if (!r.success) throw error(400, { message: `${paramName} required` });
  return r.data;
}