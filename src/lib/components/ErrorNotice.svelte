<script lang="ts">
  import { page } from '$app/state';
  import CitySearch from '$lib/components/CitySearch.svelte';
  import { translator } from '$lib/i18n/translator.svelte';

  export type Finder = 'search' | 'retry' | 'none';

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
  {:else if finder === 'retry'}
    <!-- A failure that is not a 404 is usually the network, and trying again is the answer
         a reader on mobile data needs; reloading the URL reruns the whole navigation. -->
    <button type="button" class="retry" onclick={() => location.reload()}>
      {translator.t('errorRetry')}
    </button>
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

  .retry {
    margin-top: 24px;
    min-height: 44px;
    padding: 0 20px;
    font: inherit;
    font-weight: 600;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
  }
</style>
