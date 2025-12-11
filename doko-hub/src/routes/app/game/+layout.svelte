<script lang="ts">
  import TopAppBar, { Row, Section, Title } from "@smui/top-app-bar";
  import IconButton from "@smui/icon-button";
  import TabBar from "@smui/tab-bar";
  import Tab, { Label } from "@smui/tab";

  import Menu from "@smui/menu";
  import List, { Item as ListItem } from "@smui/list";

  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  export let tabs = ["Runden", "Statistiken"];
  export let active = tabs[0];

  let menuOpen = false;
  /* Aktiver Tab anhand der URL setzen
  $: {
    const path = $page.url.pathname;

    if (path.includes("game_rounds")) active = "Runden";
    else if (path.includes("game_stats")) active = "Statistiken";
  } */

  $: path = $page.url.pathname;
  $: isRounds = path.includes("game_rounds");
  $: isStats = path.includes("game_stats");

  $: {
    if (isRounds) active = "Runden";
    else if (isStats) active = "Statistiken";
  }

  // Tab-Wechsel => Navigation
  function handleTabChange() {
    if (active === "Runden") goto("/app/game/game_rounds");
    if (active === "Statistiken") goto("/app/game/game_stats");
  }

  function addFourRounds() {
    alert("+4 Runden");
    menuOpen = false;
  }

  function finishGameEarly() {
    alert("Spiel vorzeitig beenden");
    menuOpen = false;
  }

  function deleteGame() {
    alert("Spiel löschen");
    menuOpen = false;
  }

  function goBack() {
    history.back();
  }
</script>

<!-- APPBAR 
<TopAppBar variant="fixed">
  <Row>
    <Section class="smui-top-app-bar__section--align-start">
      <IconButton onclick={goBack}>
        <span class="material-icons">arrow_back</span>
      </IconButton>

      <Title>Aktives Spiel (4/16)</Title>
    </Section>

    <Section align="end">
      <IconButton>
        <span class="material-icons">visibility</span>
      </IconButton>
      <IconButton>
        <span class="material-icons">more_vert</span>
      </IconButton>
    </Section>
  </Row>
</TopAppBar> -->

<TopAppBar variant="fixed">
  <Row>
    <Section class="smui-top-app-bar__section--align-start">
      <IconButton onclick={goBack}>
        <span class="material-icons">arrow_back</span>
      </IconButton>

      <Title>Aktives Spiel (4/16)</Title>
    </Section>

    <Section align="end">
      <IconButton>
        <span class="material-icons">visibility</span>
      </IconButton>

      <IconButton onclick={() => (menuOpen = true)}>
        <span class="material-icons">more_vert</span>
      </IconButton>

      <!-- Menü: Inhalt abhängig von isRounds -->
      <Menu bind:open={menuOpen}>
        <List>
          {#if isRounds}
            <!-- nur auf /game_rounds -->
            <ListItem onclick={addFourRounds}>+4 Runden</ListItem>
            <ListItem onclick={finishGameEarly}
              >Spiel vorzeitig beenden</ListItem
            >
            <ListItem onclick={deleteGame}>Spiel löschen</ListItem>
          {:else}
            <!-- Platzhalter für Stats-Logik -->
            <ListItem disabled></ListItem>
          {/if}
        </List>
      </Menu>
    </Section>
  </Row>
</TopAppBar>

<div class="mdc-top-app-bar--fixed-adjust"></div>

<!-- TABS -->
<TabBar {tabs} bind:active onclick={handleTabChange}>
  {#snippet tab(tab)}
    <Tab {tab}>
      <Label>{tab}</Label>
    </Tab>
  {/snippet}
</TabBar>

<!--- Seiteninhalt -->
<slot />
