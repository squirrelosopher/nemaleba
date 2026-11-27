<script lang="ts">
  import { translator } from '$lib/i18n/translator.svelte';

  let { generatedAt }: { generatedAt: string } = $props();

  const updatedAt = $derived(translator.instant(generatedAt));
</script>

<span class="stamp numeric">{translator.t('footerUpdated')} {updatedAt}</span>

<style>
  /* Deliberately unweighted: this sits opposite the copyright line and the pair should
     read as one, so it inherits the body weight exactly as that paragraph does. */
  .stamp {
    font-size: 11px;
    letter-spacing: 0;
    text-transform: none;
    color: var(--ink-faint);
    white-space: nowrap;
  }
</style>
