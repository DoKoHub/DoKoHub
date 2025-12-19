<script lang="ts">
  import Button, { Label } from "@smui/button";
  import { goto } from "$app/navigation";
  import { StaticRoute } from "$lib/frontend/routes";

  type Tab = "groups" | "stats" | "profile";
  export let activeTab: Tab = "groups";
</script>

<nav class="bottom-nav">
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
