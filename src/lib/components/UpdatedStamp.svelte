<script lang="ts">
  import { translator } from '$lib/i18n/translator.svelte';

  let { generatedAt }: { generatedAt: string } = $props();

  // Serbian local time, because every outage time on the site is too.
  const updatedAt = $derived(
    new Date(generatedAt).toLocaleString(translator.htmlLang, {
      timeZone: 'Europe/Belgrade',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  );
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
