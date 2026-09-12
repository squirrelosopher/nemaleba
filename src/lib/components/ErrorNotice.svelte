<script lang="ts">
  import { page } from '$app/state';
  import CitySearch from '$lib/components/CitySearch.svelte';

  export type Finder = 'search' | 'none';

  let {
    title,
    detail,
    finder = 'none'
  }: { title: string; detail: string; finder?: Finder } = $props();
</script>

<div class="shell page">
  <h1>{title}</h1>
  <p class="detail">{detail}</p>

  {#if finder === 'search'}
    <div class="finder">
      <CitySearch cities={page.data.registry?.cities ?? []} />
    </div>
  {/if}
</div>

<style>
  .page {
    padding-top: 84px;
  }

  h1 {
    margin: 0;
    font-size: clamp(28px, 5vw, 36px);
  }

  .detail {
    margin: 12px 0 0;
    max-width: 56ch;
    font-size: 15px;
    color: var(--ink-muted);
  }

  .finder {
    margin-top: 28px;
    max-width: 520px;
  }
</style>
