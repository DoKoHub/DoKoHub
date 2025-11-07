<!-- Anzeige für arrow_back, more_vert -->
<link
  href="https://fonts.googleapis.com/icon?family=Material+Icons"
  rel="stylesheet"
/>
<script lang="ts">
  import TopAppBar, { Row, Section, Title } from '@smui/top-app-bar';
  import IconButton from '@smui/icon-button';
  // import Menu from '@smui/menu';

  // Schnittstelle von außen
  export let groupName: string = "Gruppenname"; // z. B. "Die Chaoten"
  export let onBack: () => void = () => console.log("Zurück-Button gedrückt");
  export let onSelectGroup: () => void = () => console.log("Gruppen-Auswahl öffnen");
  export let onMenuClick: () => void = () => console.log("3-Punkte-Menü geklickt");
  </script>

  <TopAppBar variant="fixed" color="primary">
  <Row>
    <Section align="start">
      <IconButton onclick={onBack}>
        <i class="material-icons">arrow_back</i>
      </IconButton>

      <button class="group-button" on:click={onSelectGroup}>
        {groupName}
      </button>
    </Section>
    
    <Section align="end">
      <IconButton onclick={onMenuClick}>
        <i class="material-icons">more_vert</i>
      </IconButton>
    </Section>
  </Row>
</TopAppBar>

<!-- Platz für App Bar, sonst überdeckt diese tabs -->
<div style="height: 64px;"></div> <!-- Höhe der App Bar -->

<style>
  .group-button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    color: white;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 9999px;
    padding: 0.25rem 0.75rem;
    transition: background 0.2s;
    position: relative !important; 
  }

  .group-button:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }

</style>
  






