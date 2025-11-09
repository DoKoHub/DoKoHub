import type { APIRoute } from "$lib/server/routes";

export async function get<T>(route: APIRoute): Promise<T> {
  return (
    await fetch(route, {
      method: "GET",
    })
  ).json();
}

export async function post<T>(route: APIRoute, obj: T): Promise<any> {
  return (
    await fetch(route, {
      method: "POST",
      body: JSON.stringify(obj),
    })
  ).json();
}
