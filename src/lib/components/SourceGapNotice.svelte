<script lang="ts">
  import { translator } from '$lib/i18n/translator.svelte';

  // `partial` when some rows were still read, so the reader knows the list may be short;
  // otherwise this stands in for the list entirely. The tile above greys out and explains
  // itself in a tooltip; the panel only needs to say that it cannot answer.
  let { partial = false }: { partial?: boolean } = $props();
</script>

<p class="notice" class:partial role="status">
  {translator.t(partial ? 'unavailablePartial' : 'unavailableTitle')}
</p>

<style>
  .notice {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 32px 16px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
    text-align: center;
    color: var(--ink-muted);
  }

  .notice.partial {
    flex: none;
    justify-content: flex-start;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: normal;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
</style>
