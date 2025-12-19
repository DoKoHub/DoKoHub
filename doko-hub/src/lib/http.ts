import { json } from "@sveltejs/kit";

export const ok = <T>(data: T) => json(data, { status: 200 });
export const created = <T>(data: T) => json(data, { status: 201 });
export const noContent = () => new Response(null, { status: 204 });

export const badRequest = (data?: unknown) => json(data ?? { message: "Bad Request" }, { status: 400 });
export const unauthorized = (data?: unknown) => json(data ?? { message: "Unauthorized" }, { status: 401 });
export const forbidden = (data?: unknown) => json(data ?? { message: "Forbidden" }, { status: 403 });
export const notFound = (data?: unknown) => json(data ?? { message: "Not Found" }, { status: 404 });
export const conflict = (data?: unknown) => json(data ?? { message: "Conflict" }, { status: 409 });
export const serverError = (data?: unknown) => json(data ?? { message: "Internal Server Error" }, { status: 500 });

// ADD: Zod-Fehler bequem in 400 mappen (WHY: einheitliches Fehlerformat)
export const badRequestFromZod = (issues: Array<{ path: string; message: string; code: string }>) =>
  badRequest({ message: "Validation failed", issues });