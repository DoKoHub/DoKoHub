<script lang="ts">
  export let groupName: string = "Gruppenname"; // Schnittstelle von außen nach innen
  export let onBack: () => void = () => console.log("Zurück-Button gedrückt");
  export let onSelectGroup: () => void = () => console.log("Gruppen-Auswahl öffnen");
</script>

<!-- später durch svelte ui ersetzen -->
<header class="app-bar">
  <!-- Zurück-Button -->
  <button class="leading-icon" on:click={onBack}>⬅</button>
  
  <!--Gruppenname-->
  <button class="group-button" on:click={onSelectGroup}>
    <span class="group-name">{groupName}</span>
  </button>

 <!--Trailing Button-->
  <button class="trailing" on:click={() => console.log("Einstellungen öffnen")}>
    ⋮
  </button>
</header>

<style lang="scss">
@use 'sass:color';
@use '@material/theme/color-palette';
@use '@material/theme/index' as theme with (
  $primary: #955cff,
  $secondary: #676778,
  $surface: #ffffff,
  $background: #ffffff,
  $error: color-palette.$red-900
);

.app-bar {
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center; // vertikale Aussrichtung
  gap: 8px; // Abstand
  padding: 8px 12px;
  background-color: theme.$surface;
  color: theme.$on-surface;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* Zurück-Button */
.leading-icon {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background-color: theme.$surface;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover { // schwebe Effekt
    background-color: color.scale(theme.$surface, $lightness: -10%);
  }
}

/* Gruppenname-Button */
.group-button {
  display: flex;
  align-items: center; 
  justify-content: center; // Boxen gleichmäßig verteilen im Abstand
  background-color: theme.$surface; 
  border: none;
  border-radius: 30px;
  padding: 6px 16px; // Innenabstand
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: color.scale(theme.$surface, $lightness: -10%);
  }
}

.group-name {
  font-weight: 400;
  font-size: 18px;
  color: theme.$on-surface;
}

/* Trailing Button */
.trailing {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background-color: theme.$surface;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
   margin-left: auto; 
  transition: background-color 0.2s;

  &:hover {
    background-color: color.scale(theme.$surface, $lightness: -10%);
  }
}
</style>

