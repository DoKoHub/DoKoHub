<script lang="ts">
  import type { LayoutProps } from "./$types";
  import BottomAppBar from "$lib/components/BottemAppBar.svelte";

  const { children }: LayoutProps = $props();
</script>

<<<<<<< Updated upstream
<!-- DOTO: cleanup BottomAppbar als einheitliche Komponente -->
<BottomAppBar variant="fixed">
  <div class="bottom-buttons">
    <Button onclick={() => (active = "groups")}>
      <Label>Gruppe</Label>
    </Button>
=======
{@render children()}
>>>>>>> Stashed changes

<BottomAppBar activeTab="groups" />

