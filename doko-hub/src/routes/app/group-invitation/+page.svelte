<script lang="ts">
  import BottomAppBar, { Section } from '@smui-extra/bottom-app-bar';
  import Button from '@smui/button';
  import Card from '@smui/card';
  import TextField from '@smui/textfield';
  import FormField from '@smui/form-field';
  import Radio from '@smui/radio';

  export function getExistingPlayers(): string[] {
    return ['Fabian', 'Nick'];
  }

  function joinGroup() {
    const name = selected || newName;
    console.log('Beitritt mit Name:', name);
    // später: API-Aufruf oder Navigation
  }

  let active: 'groups' | 'stats' | 'profile' = 'groups';
  const existingPlayers = getExistingPlayers();
  let selected = '';
  let newName = '';
</script>

<main class="page">
  <Card class="join-card">
    <h2 class="title">Gruppe beitreten</h2>
    <p class="subtitle">
      Die Gruppe <strong>“Die Chaoten”</strong> freut sich über neue Mitspieler.
      Wähle nachfolgend einen Namen und trete der Gruppe bei.
    </p>

    <!-- Spieler-Liste -->
    <div class="player-list">
      {#each existingPlayers as name}
        <FormField>
          <label class="player-option">
            <Radio bind:group={selected} value={name} />
            <span>{name}</span>
          </label>
        </FormField>
      {/each}
    </div>

    <div class="divider">oder</div>

    <TextField
      bind:value={newName}
      label="Name"
      variant="filled"
      class="new-name-field"
    />

    <Button
      variant="raised"
      color="primary"
      class="join-button"
      disabled={!selected && !newName}
      onclick={joinGroup}
    >
      Gruppe beitreten
    </Button>
  </Card>
</main>

<BottomAppBar variant="fixed" color="primary" class="bottom-bar">
 <Section class="nav-section">
    <button
      class="nav-item"
      class:active={active === 'groups'}
      on:click={() => active = 'groups'}
    >
      Gruppen
    </button>

    <button
      class="nav-item"
      class:active={active === 'stats'}
      on:click={() => active = 'stats'}
    >
      Meine Statistiken
    </button>

    <button
      class="nav-item"
      class:active={active === 'profile'}
      on:click={() => active = 'profile'}
    >
      Profil
    </button>
  </Section>
</BottomAppBar>

<style>
  main.page {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: calc(100vh - 56px);
    padding: 2rem 1rem 6rem;
    background: #fafafa;
  }

  :global(.join-card) {
    width: 340px;
    padding: 1.25rem 1.5rem;
    padding-left: 30px;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .title {
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .subtitle {
    font-size: 0.95rem;
    color: #444;
    margin-bottom: 1rem;
  }

  .player-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .player-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0;
  }

  .divider {
    text-align: center;
    margin: 0.75rem 0;
    color: rgba(0, 0, 0, 0.6);
  }
/*
  .new-name-field {
    width: 100%;
  } 

  .join-button {
    margin-top: 1rem;
    width: 100%;
    border-radius: 25px;
  }

  .mdc-radio {
    transform: scale(0.9);
  }

  /* Navigation unten 
  .nav-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  } 
  */

  .nav-item {
    flex: 1;
    text-align: center;
    background: none;
    border: none;
    color: white;
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.4rem 0;
    opacity: 0.85;
    transition: all 0.2s ease;
  }

  .nav-item:hover {
    opacity: 1;
  }

  .nav-item.active {
    opacity: 1;
    font-weight: 600;
  }
</style>
