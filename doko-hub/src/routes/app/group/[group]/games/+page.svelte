<script lang="ts">
  import PlusButton from "$lib/components/PlusButton.svelte";
  import NewGameDialog, {
    type CreateSessionData,
  } from "./NewGameDialog.svelte";

  import type { PageProps } from "./$types";
  import { onMount } from "svelte";
  import { Session, UUID } from "$lib/types";
  import Time from "svelte-time/Time.svelte";
  import List, { Item, Text, PrimaryText, SecondaryText } from "@smui/list";
  import { post } from "$lib/frontend/fetch";
  import z from "zod";
  import { goto } from "$app/navigation";

  const { data, params }: PageProps = $props();
  // svelte-ignore state_referenced_locally
  // We need to copy the initial state for local mutations. See svelte-query for prod
  const group_id = UUID.parse(params.group);
  // svelte-ignore state_referenced_locally
  const group_members = data.group_members;
  // svelte-ignore state_referenced_locally
  let games = $state(data.sessions);

  let newGameOpen = $state(false);
  let can_start_new_game = $derived(
    group_members.length === 4 &&
      games.every(
        ({ startedAt, endedAt }) => startedAt != null && endedAt != null
      )
  );

  //FIXME: Debug-only test data, MUST BE REMOVED!!!
  onMount(() => {
    games.push({
      groupId: group_id,
      id: "game-id" as UUID,
      members: [
        {
          memberId: "member-id" as UUID,
          seatPos: 0,
          playerId: null,
          status: "ACTIVE",
        },
      ],
      plannedRounds: 24,
      ruleset: "STANDARD",
      endedAt: null,
      startedAt: new Date(),
    });
  });

  async function create_session({
    planned_rounds,
    session_members,
    use_pflichtsolo,
  }: CreateSessionData) {
    try {
      const { session } = await post(
        `/api/group/${group_id}/session`,
        {
          ruleset: use_pflichtsolo ? "STANDARD" : "HAUSREGEL_KEINE_PFLICHTSOLO",
          plannedRounds: planned_rounds,
        },
        z.object({ message: z.string(), session: Session })
      );

      //TODO: this should be a single request for data consistency!
      for (const { memberId, seatPos } of session_members) {
        await post(
          `/api/group/${group_id}/session/${session.id}/sessionmember`,
          {
            memberId,
            seatPos,
          },
          z.any()
        );
      }
    } catch (e) {
      console.error("Error while creating session: ", e);
    }
  }
</script>

<!-- dynamischer Inhalt-->
<main class="main-content">
  <List twoLine>
    {#each games as game}
      <!--TODO: go to game page. That needs to be moved somewhere like /app/game/[gameId]/rounds-->
      <Item onclick={() => goto(`/app/game/${game.id}/overview/rounds`)}>
        <Text>
          <PrimaryText>
            {#if game.startedAt}
              <Time timestamp={game.startedAt} format="DD.MM.YYYY"></Time>
            {:else}
              Noch nicht gestartet
            {/if}
          </PrimaryText>
          <SecondaryText>
            {#if game.endedAt}
              <!--TODO: How to determine the winner of a game? Should that be part of DTO?-->
              <small>Sieger: TBD</small>
            {:else}
              <small>{"Spiel muss noch beendet werden"}</small>
            {/if}
          </SecondaryText>
        </Text>
      </Item>
    {/each}
  </List>
</main>

//TODO: remove the `|| true` once debugging is done
{#if can_start_new_game || true}
  <PlusButton addSomething={() => (newGameOpen = true)} />
{/if}

<NewGameDialog
  bind:open={newGameOpen}
  onsubmit={create_session}
  {group_members}
/>
