<script lang="ts">
  import TopAppBar, { Title, Section } from "@smui/top-app-bar";
  import List, {
    Item,
    PrimaryText,
    SecondaryText,
    Separator,
    Text,
  } from "@smui/list";
  import Time from "svelte-time";
  import type { PageProps } from "./$types";
  import type { Group } from "./+page";

  const { data }: PageProps = $props();

  import Dialog, {
    Title as DialogTitle,
    Content as DialogContent,
    Actions as DialogActions,
  } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Textfield from "@smui/textfield";
  import Icon from "@smui/textfield/icon"; // für das "X"-Symbol rechts im Textfeld

  let dialogOpen = $state(false);
  let groupName = $state("New Group");

  function handleCreate(name: string) {
    console.log("Neue Gruppe erstellt:", name);
    dialogOpen = false;
  }
</script>

{#snippet GroupItem(group: Group)}
  <Text>
    <PrimaryText>{group.name}</PrimaryText>
    <SecondaryText>Spieler: {group.players.join(", ")}</SecondaryText>
    <SecondaryText
      >Zuletzt gespielt am:
      <Time timestamp={group.last_played} format="dd.MM.YYYY"></Time>
    </SecondaryText>
  </Text>
{/snippet}

<div class="app-container">
  <TopAppBar variant="fixed" class="top-bar">
    <Section>
      <Title>DoKoHub</Title>
    </Section>
  </TopAppBar>
  <div class="app-main">
    <List threeLine>
      {#each data.groups as group}
        <Item>
          {@render GroupItem(group)}
        </Item>
        <Separator />
      {/each}
    </List>
  </div>
  <!-- FAB unten rechts -->
  <button
    class="fab"
    aria-label="Neue Gruppe erstellen"
    onclick={() => (dialogOpen = true)}
  >
    <span class="material-icons">add</span>
  </button>

  <!-- Dialog -->
  <Dialog bind:open={dialogOpen} class="new-group-dialog">
    <DialogTitle>Neue Gruppe erstellen</DialogTitle>

    <DialogContent>
      <Textfield
        label="Name"
        variant="filled"
        class="w-full"
        bind:value={groupName}
        withTrailingIcon
      >
        {#snippet trailingIcon()}
          <Icon
            class="material-icons"
            role="button"
            onclick={() => (groupName = "")}
          >
            close
          </Icon>
        {/snippet}
      </Textfield>
    </DialogContent>

    <DialogActions class="dlg-actions-right">
      <Button onclick={() => (dialogOpen = false)}>
        <Label>Abbrechen</Label>
      </Button>
      <Button
        onclick={() => handleCreate(groupName)}
        disabled={!groupName.trim()}
      >
        <Label>Ok</Label>
      </Button>
    </DialogActions>
  </Dialog>
</div>

<style>
  :global(body) {
    margin: 0;
    width: 100vw;
  }

  .app-container {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
  }

  .app-main {
    margin-top: 40px; /*HACK: The app bar is 40px tall and position:fixed so we need to move 40px down so we don't intersect it*/
    width: 100%;
  }
  /* FAB unten rechts */
  .fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background-color: #6750a4; /* Lila wie im Figma */
    color: white;
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .fab:hover {
    background-color: #7c5ce2;
  }

  /* Dialog-Styling wie Figma */
  :global(.mdc-dialog__surface) {
    border-radius: 24px;
    background: #f4eef9;
    color: #1b1b1f;
  }

  /* Buttons unten rechts ausrichten */
  :global(.mdc-dialog__actions) {
    justify-content: flex-end;
    gap: 20px;
  }

  /* Textfield hell + Lila Akzent */
  :global(.mdc-text-field--filled) {
    background: #efe8f5;
  }
  :global(.mdc-text-field--filled .mdc-line-ripple) {
    background-color: #6750a4;
  }
  :global(.mdc-button) {
    --mdc-theme-primary: #6750a4;
  }
</style>
