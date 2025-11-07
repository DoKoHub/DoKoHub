import type { PageLoad } from "./$types";

//TODO: replace this with an actual DTO once the backend is ready
export interface Group {
  name: string;
  players: string[];
  last_played: Date;
}

export const load: PageLoad = async () => {
  //TODO: blocked until api/player/[player]/groups endpoint is ready
  return {
    groups: [
      {
        name: "Die Chaoten",
        players: ["Fabian", "Maurice", "Nick", "Marcel"],
        last_played: new Date("2025-10-28"),
      },
      {
        name: "Familie",
        players: ["Helga", "Manfred", "Nick", "Tony"],
        last_played: new Date(0),
      },
    ] as Group[],
  };
};
export const ssr = false;
export const csr = true;