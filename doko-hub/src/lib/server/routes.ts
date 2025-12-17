import type { UUID } from "$lib/types";

export type APIRoute =
  | "/api/player"
  | `/api/player/${UUID}`
  | `/api/player/${UUID}/groups`
  | `/api/group`
  | `/api/group/${UUID}`
  | `/api/group/${UUID}/invite`
  | `/api/group/${UUID}/member`
  | `/api/group/${UUID}/session`
  | `/api/group/${UUID}/session/${UUID}`
  | `/api/group/${UUID}/session/${UUID}/result`
  | `/api/group/${UUID}/session/${UUID}/round`
  | `/api/group/${UUID}/session/${UUID}/round/${UUID}/bonus`
  | `/api/group/${UUID}/session/${UUID}/round/${UUID}/bonus/${UUID}`
  | `/api/group/${UUID}/session/${UUID}/round/${UUID}/call`
  | `/api/group/${UUID}/session/${UUID}/round/${UUID}/call/${UUID}`
  | `/api/group/${UUID}/session/${UUID}/round/${UUID}/participation`
  | `/api/group/${UUID}/session/${UUID}/round/${UUID}/participation/${UUID}`
  | `/api/group/${UUID}/session/${UUID}/sessionmember`
  | `/api/group/join/${UUID}`;
