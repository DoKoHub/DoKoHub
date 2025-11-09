import type { UUID } from "$lib/types";

export type APIRoute =
  | "/api/player"
  | `/api/player/${UUID}`
  | `/api/player/${UUID}/register`
  | `/api/player/${UUID}/identity`
  | `/api/group`
  | `/api/group/${UUID}`
  | `/api/group/${UUID}/invite`
  | `/api/group/${UUID}/member`
  | `/api/group/${UUID}/${UUID}`
  | `/api/group/join/${UUID}`;
