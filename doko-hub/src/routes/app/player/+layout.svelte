<script lang="ts">
  import type { LayoutProps } from "./$types";
  import TopAppBar, { Title, Section } from "@smui/top-app-bar";
  import Button, { Label } from "@smui/button";
  import { goto } from "$app/navigation";
  import { StaticRoute } from "$lib/frontend/routes";

  type Tab = "groups" | "stats" | "profile";

  const { children }: LayoutProps = $props();

  let activeTab = $state<Tab>("groups");
</script>

<!-- Obere AppBar -->
<TopAppBar variant="fixed" class="top-bar">
  <Section align="start">
    <Title>DoKoHub</Title>
  </Section>
</TopAppBar>

<main class="content">
  {@render children()}
</main>

<!-- Bottom-Navigation -->
<nav class="bottom-nav">
  <!-- Gruppen -->
  <Button
    class="bottom-nav-button"
    variant="text"
    onclick={() => goto(StaticRoute.GROUP_OVERVIEW)}
  >
    <div class="icon-wrapper" class:active={activeTab === "groups"}>
      <span class="material-icons nav-icon">groups</span>
    </div>
    <Label>Gruppen</Label>
  </Button>

  <!-- Meine Statistiken -->
  <Button
    class="bottom-nav-button"
    variant="text"
    onclick={() => goto(StaticRoute.PLAYER_STATS)}
  >
    <div class="icon-wrapper" class:active={activeTab === "stats"}>
      <span class="material-icons nav-icon">insert_chart</span>
    </div>
    <Label>Meine Statistiken</Label>
  </Button>

  <!-- Profil -->
  <Button
    class="bottom-nav-button"
    variant="text"
    onclick={() => goto(StaticRoute.PLAYER_PROFILE)}
  >
    <div class="icon-wrapper" class:active={activeTab === "profile"}>
      <span class="material-icons nav-icon">person</span>
    </div>
    <Label>Profil</Label>
  </Button>
</nav>

<style>
  /* Inhalt unter der AppBar */
  .content {
    padding-top: 48px; /*HACK: The app bar is 48px tall so we need to move down*/
    padding-bottom: 88px;
    min-height: 100vh;
    box-sizing: border-box;
  }

  /* Bottom-Navigation */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }

  :global(.bottom-nav-button) {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 90px;
  }
</style>
