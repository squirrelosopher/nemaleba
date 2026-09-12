<script lang="ts">
  import { page } from '$app/state';
  import { PUBLIC_SITE_ORIGIN } from '$env/static/public';
  import { Locale } from '$lib/i18n/locale';
  import { translator } from '$lib/i18n/translator.svelte';

  let { title, description }: { title: string; description: string } = $props();

  const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
    [Locale.Cyrillic]: 'sr_RS',
    [Locale.Latin]: 'sr_RS',
    [Locale.English]: 'en_US'
  };

  const url = $derived(PUBLIC_SITE_ORIGIN ? `${PUBLIC_SITE_ORIGIN}${page.url.pathname}` : null);
  const image = $derived(PUBLIC_SITE_ORIGIN ? `${PUBLIC_SITE_ORIGIN}/og.png` : null);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="nemaleba.rs" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:locale" content={OPEN_GRAPH_LOCALE[translator.current]} />

  {#if url}
    <meta property="og:url" content={url} />
  {/if}

  {#if image}
    <meta property="og:image" content={image} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="nemaleba.rs" />
    <meta name="twitter:image" content={image} />
  {/if}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
</svelte:head>
