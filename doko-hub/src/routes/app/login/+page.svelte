<script lang="ts">
  import TopAppBar, { Title, Section } from "@smui/top-app-bar";
  import Card, { Content } from "@smui/card";
  import List, { Item } from "@smui/list";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
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
        <h6 class="mdc-typography--headline6" style="margin: 0;">Einloggen</h6>
        Um DoKoHub nutzen zu können, müssen Sie sich einloggen. Wählen Sie hierfür
        einen der folgenden Dienste:
        <List>
          {#each data.oauth_providers as provider}
            <Item onclick={() => console.log(provider.name)}>
              {provider.displayName}
            </Item>
          {/each}
        </List>
      </Content>
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
    max-width: 300px;
    margin: 25px;
    text-wrap-mode: wrap;
  }
</style>
