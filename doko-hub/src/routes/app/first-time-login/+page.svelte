<script lang="ts">
  import TopAppBar, { Title, Section } from "@smui/top-app-bar";
  import Card, { Content } from "@smui/card";
  import Textfield from "@smui/textfield";

  import { first_time_login } from "$lib/frontend/auth.svelte";

  let user_name: string = $state("");

  async function handle_key_down(event: KeyboardEvent) {
    // Remove white space from the name
    if (event.key === "Enter") {
      console.log(`Got name "${user_name}"`);
      first_time_login(user_name);
      //TODO: redirect to home page on successful login
    }
  }
</script>

<div class="app-container">
  <TopAppBar variant="fixed" class="top-bar">
    <Section>
      <Title>DoKoHub</Title>
    </Section>
  </TopAppBar>
  <div class="login-card-container">
    <Card padded class="login-card">
      <Content>
        <h6 class="mdc-typography--headline6" style="margin: 0;">
          {#if user_name}
            Herzlich Willkommen, {user_name}!
          {:else}
            Herzlich Willkommen!
          {/if}
        </h6>
        Gib deinen Namen an, damit Andere dich zuordnen können.
      </Content>
      <Textfield
        bind:value={user_name}
        label="Name"
        style="min-width: 250px;"
        required
        validateOnValueChange
        onkeydown={handle_key_down}
        oninput={() => (user_name = user_name.trim())}
      ></Textfield>
    </Card>
  </div>
</div>

<style>
  :global(body) {
    height: 100vh;
    margin: 0;
  }

  .app-container {
    display: flex;
    height: 100%;
    flex-direction: column;
  }

  .login-card-container {
    flex: 1;

    width: 100%;

    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.login-card) {
    max-width: max(300px, 75%);
    margin: 25px;
  }
</style>
