import type { Player } from "$lib/types";
import { post } from "./fetch";

let user: Player | null = $state(null);

export async function first_time_login(name: string) {
  const { player }: { player: Player } = await post("/api/player", {
    name,
  });

  console.table(player);
  user = player;
}

export function get_user(): Player {
  if (user == null) {
    throw new Error("Not logged in!");
  }
  return user;
}

export async function login() {
  throw new Error("Not Implemented");
}
