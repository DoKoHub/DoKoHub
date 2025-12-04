import type { PageLoad } from "./$types";
import { PlayGroup } from "$lib/types";
import { get } from "$lib/frontend/fetch";
import { get_user } from "$lib/frontend/auth";
import z from "zod";
import { goto } from "$app/navigation";

/* Wird von svelte aufgerufen, wenn die Seite geladen wird.
  Hier machen wir die erste API-Anfrage, um die Seite überhaupt mit Daten zu füllen
 */
export const load: PageLoad = async ({ fetch }) => {
  let user;
  try {
    // ID des momentanen Nutzers holen
    user = get_user();
  } catch (e) {
    // Error during login, redirect to login page
    await goto("/app/first-time-login");
    throw new Error("Unreachable"); //thanks, typescript >:3
  }
  /*
    Hier nutzen wir die `get`-Funktion, um Daten vom backend zu holen.
    Der erste Parameter gibt den API-Endpoint an (man kann keine falschen angeben!).
    Der zweite Parameter gibt den Typen an, den wir als Rückgabe erwarten.
    Der dritte parameter hat mit sveltekit zu tun. In +page.ts-Dateien sollte man ihn mit angeben
  */
  //FIXME: Will show generic 500 if the request fails
  const groups = await get(
    `/api/player/${user.id}/groups`,
    z.array(PlayGroup),
    fetch
  );

  return {
    groups,
  };
};

export const ssr = false;
