import type { APIRoute } from "$lib/server/routes";
import type z from "zod";

export async function get<T extends z.ZodType>(
  route: APIRoute,
  schema: T,
  do_fetch?: (route: APIRoute, options: any) => Promise<Response>
): Promise<z.infer<T>> {
  do_fetch = do_fetch || fetch;
  return await do_fetch(route, { method: "GET" })
    .then((b) => b.json())
    .then(schema.parse);
}

export async function post<T, R extends z.ZodType>(
  route: APIRoute,
  obj: T,
  response_schema: R,
  do_fetch?: (route: APIRoute, options: any) => Promise<Response>
): Promise<z.infer<R>> {
  do_fetch = do_fetch || fetch;

  return await do_fetch(route, {
    method: "POST",
    body: JSON.stringify(obj),
  })
    .then((b) => b.json())
    .then(response_schema.parse);
}
