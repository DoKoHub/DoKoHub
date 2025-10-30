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
</style>
