<script lang="ts">
  import Dialog, {
    Title as DialogTitle,
    Content as DialogContent,
    Actions as DialogActions,
  } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Switch from "@smui/switch";
  import IconButton from "@smui/icon-button";
  import { mdiRefresh } from "@mdi/js"; // refresh Symbol
  import type { SessionMember, PlayGroupMember, UUID } from "$lib/types";
  import FormField from "@smui/form-field";
  import Radio from "@smui/radio";
  import List, { Item, Text } from "@smui/list";

  // FIXME: there should be a DTO for this!
  export type CreateSessionData = {
    use_pflichtsolo: boolean;
    session_members: SessionMember[];
    planned_rounds: number;
  };

  type OwnProps = {
    open: boolean;
    group_members: PlayGroupMember[];
    onsubmit?: (session_data: CreateSessionData) => void;
  };

  //TODO: this is a hack until the DTOs improve. See https://github.com/DoKoHub/DoKoHub/issues/82
  type NamedSessionMember = SessionMember & { nickname: string };

  const round_options = [8, 12, 16, 20, 24];

  let { open = $bindable(), group_members, onsubmit }: OwnProps = $props();

  let use_pflichtsolo = $state(true);
  let session_members: NamedSessionMember[] = $derived(
    group_members.map(({ id, nickname }, i) => ({
      sessionId: "FIXME-FAKE-ID" as UUID, //FIXME: this shouldn't be here at all!
      memberId: id,
      seatPos: i + 1,
      nickname: nickname!, //FIXME: the DTOs don't reflect that the nickname is never null
    }))
  );
  let n_rounds: number = $state(8);

  function shuffle_members() {
    session_members.sort(() => Math.random() - 0.5);
  }
</script>

<Dialog
  bind:open
  class="new-game-dialog"
  aria-labelledby="ng-title"
  aria-describedby="ng-desc"
>
  <DialogTitle id="ng-title">Neues Spiel starten</DialogTitle>

  <DialogContent>
    <p id="ng-desc" class="hint">
      Wählen Sie ob Sie mit oder ohne Pflichtsolos spielen möchten. Anschließend
      können Sie die vorgegebene Sitzreihenfolge anpassen.
    </p>

    <!-- Mit Pflichtsolos -->
    <div class="switch-row">
      <span>Mit Pflichtsolos</span>
      <FormField>
        <Switch bind:checked={use_pflichtsolo} />
      </FormField>
    </div>

    <!-- Spielrunden -->
    <div class="section">
      <span>Spielrunden</span>
      <div class="round-buttons">
        {#each round_options as rounds}
          <FormField>
            <Radio bind:group={n_rounds} value={rounds} />
            {#snippet label()}
              {rounds}
            {/snippet}
          </FormField>
        {/each}
      </div>
    </div>

    <!-- Sitzreihenfolge -->
    <div class="section">
      <div class="row-header">
        <span>Sitzreihenfolge</span>
        <IconButton
          class="refresh-btn"
          title="Zufällige Reihenfolge"
          onclick={shuffle_members}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d={mdiRefresh} />
          </svg>
        </IconButton>
      </div>

      <List>
        {#each session_members as m}
          <Item onclick={() => {}}>
            <Text>
              {m.nickname}
            </Text>
          </Item>
        {/each}
      </List>
    </div>
  </DialogContent>

  <DialogActions class="dlg-actions-right">
    <Button onclick={() => (open = false)}><Label>Abbrechen</Label></Button>
    <Button
      onclick={() =>
        onsubmit?.({
          use_pflichtsolo,
          session_members,
          planned_rounds: n_rounds,
        })}><Label>Start</Label></Button
    >
  </DialogActions>
</Dialog>
