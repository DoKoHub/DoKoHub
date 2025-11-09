import type { UUID } from "$lib/types";

export type APIRoute =
  | "/api/player"
  | `/api/player/${UUID}`
  | `/api/player/${UUID}/register`
  | `/api/player/${UUID}/identity`
  | `/api/player/${UUID}/groups`
  | `/api/group`
  | `/api/group/${UUID}`
  | `/api/group/${UUID}/invite`
  | `/api/group/${UUID}/member`
  | `/api/group/${UUID}/session`
  | `/api/group/${UUID}/session/${UUID}`
  | `/api/group/${UUID}/session/${UUID}/sessionmember`
  | `/api/group/join/${UUID}`;
