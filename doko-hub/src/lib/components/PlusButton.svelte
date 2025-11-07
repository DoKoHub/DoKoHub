<script lang="ts">
  import Fab, { Icon } from '@smui/fab';
  import { mdiPlus } from '@mdi/js';

  export let addSomething: () => void;
</script>

<Fab class="fab" onclick={addSomething} color="primary">
  <Icon tag="svg" viewBox="2 2 20 20">
    <path fill="currentColor" d={mdiPlus} />
  </Icon>
</Fab>

<style>
  /* globales Styling, unabhängig vom Komponenten-Scope greift */
  :global(.fab) {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background-color: #ff3e00;
    color: white;
    z-index: 1000; /* über Tabs, App Bar */
  }

  :global(.fab:hover) {
    background-color: #e03600;
  }
</style>


