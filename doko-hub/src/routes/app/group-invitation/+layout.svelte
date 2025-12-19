<script lang="ts">
  import type { LayoutProps } from "./$types";
  import BottomAppBar from "$lib/components/BottemAppBar.svelte";

  const { children }: LayoutProps = $props();
</script>

{@render children()}

<BottomAppBar activeTab="groups" />

