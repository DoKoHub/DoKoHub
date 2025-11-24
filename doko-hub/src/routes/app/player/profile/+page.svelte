<script lang="ts">
  import TopAppBar, { Title, Section } from "@smui/top-app-bar";
  import Button, { Label } from "@smui/button";
  import { goto } from "$app/navigation";

  // Profil ist aktiv
  let activeTab: "groups" | "stats" | "profile" = "profile";

  // Welche Klasse bekommt der Button?
  function tabClass(tab: "groups" | "stats" | "profile") {
    return `bottom-nav-button${activeTab === tab ? " active" : ""}`;
  }

  // Navigation wie bei stats_overview
  function goTo(tab: "groups" | "stats" | "profile") {
    activeTab = tab;

    if (tab === "groups") {
      goto("/app/group-overview");
    } else if (tab === "stats") {
      goto("/app/player/stats_overview");
    } else if (tab === "profile") {
      goto("/app/player/profile");
    }
  }
</script>

<!-- Obere AppBar -->
<TopAppBar variant="fixed" class="top-bar">
  <Section align="start">
    <Title>DoKoHub</Title>
  </Section>
</TopAppBar>

<!-- Inhalt der Profil-Seite -->
<main class="content">
  <!-- aktuell noch leer – hier kommt später dein Profil hin -->
</main>

<!-- Bottom-Navigation -->
<nav class="bottom-nav">
  <!-- Gruppen -->
  <Button
    class="bottom-nav-button"
    variant="text"
    onclick={() => goTo("groups")}
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
    onclick={() => goTo("stats")}
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
    onclick={() => goTo("profile")}
  >
    <div class="icon-wrapper" class:active={activeTab === "profile"}>
      <span class="material-icons nav-icon">person</span>
    </div>
    <Label>Profil</Label>
  </Button>
</nav>

<style>
  :global(body) {
    margin: 0;
    background: #f4eef9;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Roboto",
      sans-serif;
  }

  /* AppBar */
  :global(.top-bar) {
    background: #f4eef9;
    color: #1b1b1f;
  }

  /* Inhalt unter der AppBar */
  .content {
    padding-top: 64px;
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
    background: #f4eef9;
    display: flex;
    justify-content: space-around;
    align-items: center;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }

  :global(.bottom-nav-button) {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 90px;
  }

  /* Inhalt im SMUI-Button (Icon + Label untereinander) */
  :global(.bottom-nav-button .mdc-button__label) {
    text-transform: none !important;
    font-size: 12px;
    letter-spacing: 0.8px;
  }

  .nav-icon {
    font-size: 22px;
    color: #6750a4;
  }

  /* lila 
  .bottom-nav :global(.material-icons),
  .bottom-nav :global(.mdc-button__label) {
    color: #6750a4;
  }
    */

  /* Bubble NUR um das Icon */
  .icon-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px 16px;
    border-radius: 999px;
    transition: all 0.2s ease;
  }

  .icon-wrapper.active {
    background: rgba(103, 80, 164, 0.12);
  }

  .bottom-nav :global(.mdc-button__label) {
    color: #6750a4;
  }
</style>
