<script lang="ts">
  import BottomAppBar from "@smui-extra/bottom-app-bar";
  import Button, { Label } from "@smui/button";

  let active: "groups" | "stats" | "profile" = "groups";
</script>

<BottomAppBar variant="fixed">
  <div class="bottom-buttons">
    <Button onclick={() => (active = "groups")}>
      <Label>Gruppe</Label>
    </Button>

    <Button onclick={() => (active = "stats")}>
      <Label>Statistiken</Label>
    </Button>

    <Button onclick={() => (active = "profile")}>
      <Label>Profil</Label>
    </Button>
  </div>
</BottomAppBar>

<!--- Seiteninhalt -->
<slot />

<style>
  .bottom-buttons {
    display: flex;
    justify-content: space-evenly; /* oder space-around / space-between */
    align-items: center;
    width: 100%;
  }
</style>
