<script lang="ts">
  import Button from "@smui/button";
  import Wrapper from "@smui/touch-target";
  let eingabe = 0;

  async function nummerSenden() {
    await fetch("/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eingabe: eingabe }),
    });
  }
</script>

<input type="number" bind:value={eingabe} />
<Wrapper>
  <Button onclick={nummerSenden}>senden</Button>
</Wrapper>
