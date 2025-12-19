<script lang="ts">
  import type { LayoutProps } from "./$types";
  import TopAppBar, { Title, Section } from "@smui/top-app-bar";
  import BottomAppBar from "$lib/components/BottemAppBar.svelte";

  type Tab = "groups" | "stats" | "profile";

  const { children }: LayoutProps = $props();
  let activeTab = $state<Tab>("groups");
</script>

<TopAppBar variant="fixed" class="top-bar">
  <Section align="start">
    <Title>DoKoHub</Title>
  </Section>
</TopAppBar>

<main class="content">
  {@render children()}
</main>

<BottomAppBar {activeTab} />

<style>
  .content {
    padding-top: 48px;
    padding-bottom: 88px;
    min-height: 100vh;
    box-sizing: border-box;
  }
</style>
