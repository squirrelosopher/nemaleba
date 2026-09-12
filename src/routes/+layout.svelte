<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { afterNavigate, beforeNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { PUBLIC_SITE_ORIGIN } from '$env/static/public';
  import { Locale, translator } from '$lib/i18n/translator.svelte';
  import { localePath, pathWithoutLocale } from '$lib/i18n/routing';
  import { registerServiceWorker } from '$lib/notifications/pushClient';
  import { trail } from '$lib/navigation/trail.svelte';
  import { notificationLog } from '$lib/notifications/notificationLog.svelte';
  import { badgeTab } from '$lib/notifications/tabBadge';
  import ErrorNotice from '$lib/components/ErrorNotice.svelte';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import ToastStack from '$lib/components/ToastStack.svelte';

  let { children, data } = $props();

  const SLIDE_PIXELS = 14;

  const duration =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : 190;

  let back = $state(false);

  beforeNavigate((navigation) => {
    back = navigation.type === 'popstate' && (navigation.delta ?? 0) < 0;
  });

  afterNavigate((navigation) => {
    trail.walked(
      navigation.from?.url.pathname ?? null,
      navigation.to?.url.pathname ?? null,
      navigation.type === 'popstate' && (navigation.delta ?? 0) < 0,
      Math.abs(navigation.delta ?? 1)
    );
  });

  onMount(() => {
    registerServiceWorker();

    // Children mount before their parent, so by the time this runs every reader-specific
    // correction on the page is already applied. An effect would fire mid-hydration and
    // reveal a half-built page. Waiting one frame lets the corrections settle while
    // transitions are still suppressed, so what appears is the final state.
    requestAnimationFrame(() => {
      delete document.documentElement.dataset.hydrating;

      // The panel mark decided the first paint; from here the selection is Svelte's, and
      // leaving the mark in place would pin the panel against the reader's next tap.
      delete document.documentElement.dataset.panel;
    });
  });

  $effect(() => {
    document.documentElement.lang = translator.htmlLang;
  });

  // Re-runs on a new count and on every navigation, since the title it prefixes is
  // written afresh by whichever page the reader opened.
  $effect(() => {
    page.url.pathname;

    return badgeTab(notificationLog.unread);
  });

  // Search engines need fully qualified alternates, so they are emitted only once the
  // origin is known at build time. Half-formed hreflang is worse than none.
  const path = $derived(pathWithoutLocale());

  const alternates = $derived(
    PUBLIC_SITE_ORIGIN
      ? [
          { lang: 'x-default', url: `${PUBLIC_SITE_ORIGIN}${localePath(path, Locale.Latin)}` },
          { lang: 'sr-Latn', url: `${PUBLIC_SITE_ORIGIN}${localePath(path, Locale.Latin)}` },
          { lang: 'sr-Cyrl', url: `${PUBLIC_SITE_ORIGIN}${localePath(path, Locale.Cyrillic)}` },
          { lang: 'en', url: `${PUBLIC_SITE_ORIGIN}${localePath(path, Locale.English)}` }
        ]
      : []
  );

  // The /sr-lat alias carries the same words as the bare URL, so it points there rather
  // than competing with it.
  const canonical = $derived(
    PUBLIC_SITE_ORIGIN
      ? `${PUBLIC_SITE_ORIGIN}${localePath(path, translator.current)}`
      : null
  );
</script>

<svelte:head>
  {#if canonical}
    <link rel="canonical" href={canonical} />
  {/if}
  {#each alternates as alternate (alternate.lang)}
    <link rel="alternate" hreflang={alternate.lang} href={alternate.url} />
  {/each}
</svelte:head>

<SiteHeader />

<main>
  <!-- Keyed on the locale-free path, so switching language rebuilds nothing: the same
       page is being read in another language, and the slide belongs to arriving at a
       different one. Everything on screen keeps the state it had. -->
  {#key path}
    <div in:fly={{ x: back ? -SLIDE_PIXELS : SLIDE_PIXELS, duration, easing: cubicOut }}>
      <svelte:boundary>
        {@render children()}

        {#snippet failed()}
          <ErrorNotice
            title={translator.t('errorGenericTitle')}
            detail={translator.t('errorGenericDetail')}
          />
        {/snippet}
      </svelte:boundary>
    </div>
  {/key}
</main>

<SiteFooter generatedAt={data.registry.generatedAt} />

<ToastStack />

<style>
  main {
    min-height: calc(100dvh - 58px - 120px);
    padding-bottom: 64px;
  }
</style>
