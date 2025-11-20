<script lang="ts">
  import TopAppBar, { Section, Title } from "@smui/top-app-bar";
  import IconButton from "@smui/icon-button";

  // 0 = Runden, 1 = Statistiken (Figma zeigt "Statistiken" aktiv)
  let activeTab: 0 | 1 = 1;

  function goBack() {
    history.back();
  }

  function openMenu() {
    console.log("Menü öffnen …");
  }

  function selectTab(tab: 0 | 1) {
    activeTab = tab;
  }
</script>

<div class="page">
  <!-- ===== Obere AppBar (fixiert) ===== -->
  <TopAppBar variant="fixed" class="top-bar">
    <Section align="start">
      <!-- Zurück-Pfeil -->
      <IconButton class="nav-icon-btn" onclick={goBack}>
        <span class="material-icons">arrow_back</span>
      </IconButton>

      <Title>Aktives Spiel</Title>

      <!-- Platzhalter, damit das Drei-Punkte-Icon rechts steht -->
      <div class="top-bar-spacer"></div>

      <!-- Drei-Punkte-Menü -->
      <IconButton class="nav-icon-btn" onclick={openMenu}>
        <span class="material-icons">more_vert</span>
      </IconButton>
    </Section>
  </TopAppBar>

  <!-- Alles unterhalb der fixen AppBar -->
  <div class="fixed-adjust">
    <!-- ===== Tabs direkt unter der AppBar ===== -->
    <div class="tabs-wrapper">
      <div class="tabs-row">
        <!-- Tab 0: Runden -->
        <button
          type="button"
          class={"tab-button" + (activeTab === 0 ? " active" : "")}
          on:click={() => selectTab(0)}
        >
          <span class="material-icons tab-icon">view_list</span>
          <span class="tab-label">Runden</span>
          <span class="tab-underline"></span>
        </button>

        <!-- Tab 1: Statistiken -->
        <button
          type="button"
          class={"tab-button" + (activeTab === 1 ? " active" : "")}
          on:click={() => selectTab(1)}
        >
          <span class="material-icons tab-icon">insert_chart</span>
          <span class="tab-label">Statistiken</span>
          <span class="tab-underline"></span>
        </button>
      </div>
    </div>

    <!-- ===== Hauptinhalt ===== -->
    <main class="content">
      <p class="placeholder">Hier kommen später die Statistiken hin.</p>
    </main>
  </div>
</div>

<style>
  /* ===== Grundlayout / Hintergrund ===== */
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

  .page {
    min-height: 100vh;
    background: #f4eef9;
  }

  /* ===== AppBar ===== */
  :global(.top-bar) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #f4eef9;
    color: #1b1b1f;
    box-shadow: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    z-index: 10;
  }

  .nav-icon-btn span.material-icons {
    color: #000000 !important;
  }
  .top-bar-spacer {
    flex: 1;
  }

  /* Platz für AppBar + Tabs schaffen */
  .fixed-adjust {
    padding-top: 120px;
  }

  /* ===== Tabs-Bereich ===== */
  .tabs-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  .tabs-row {
    display: flex;
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  }

  .tab-button {
    flex: 1;
    border: none;
    background: transparent;
    padding: 12px 16px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  }

  /* große Icons  */
  .tab-icon {
    font-size: 28px;
  }

  .tab-label {
    margin-top: 8px;
    font-size: 15px;
    font-weight: 500;
  }

  /* Unterstrich */
  .tab-underline {
    margin-top: 10px;
    height: 4px;
    width: 100%;
    border-radius: 999px;
    background: transparent;
  }

  /* Aktiver Tab */
  .tab-button.active .tab-icon,
  .tab-button.active .tab-label {
    color: #6750a4;
    font-weight: 600;
  }

  .tab-button.active .tab-underline {
    background: #6750a4;
  }
  /* ===== Inhalt ===== */
  .content {
    padding-top: 40px;
    padding-bottom: 40px;
    min-height: calc(100vh - 160px);
    box-sizing: border-box;
  }

  .avatar-wrapper {
    display: none !important;
  }

  .avatar-circle {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #4caf50;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }

  .placeholder {
    margin-top: 32px;
    text-align: center;
    color: #5f5f66;
  }
</style>
