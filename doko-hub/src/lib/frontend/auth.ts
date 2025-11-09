import { Player } from "$lib/types";
import z from "zod";
import { post } from "./fetch";

const LOCALSTORAGE_KEY = "dokohub-data";
const PLAYER_KEY = `${LOCALSTORAGE_KEY}-player`;

export async function first_time_login(name: string) {
  const { player } = await post(
    "/api/player",
    {
      name,
    },
    z.object({ message: z.string(), player: Player })
  );

  console.table(player);
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function get_user(): Player {
  const user_string = localStorage.getItem(PLAYER_KEY);
  if (user_string == null) throw new Error("Not logged in!");

  return Player.parse(JSON.parse(user_string));
}

export async function login() {
  throw new Error("Not Implemented");
}
