<script lang="ts">
  import { fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Locale, translator } from '$lib/i18n/translator.svelte';
  import { localeHref, pathWithoutLocale } from '$lib/i18n/routing';
  import { updateLocale } from '$lib/notifications/pushClient';

  const options: Array<{ value: Locale; label: string }> = [
    { value: Locale.Cyrillic, label: 'Ћир' },
    { value: Locale.Latin, label: 'Lat' },
    { value: Locale.English, label: 'Eng' }
  ];

  const SLIDE_PIXELS = 18;

  const duration =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : 200;

  const index = $derived(
    Math.max(
      0,
      options.findIndex((option) => option.value === translator.current)
    )
  );

  const current = $derived(options[index]);
  const next = $derived(options[(index + 1) % options.length]);

  // The locale lives in the URL, so switching is a navigation. The stored copy only
  // decides where a later visit to a bare URL gets sent.
  function choose(value: Locale): void {
    translator.remember(value);
    updateLocale(value).catch(() => undefined);
    goto(`${localeHref(pathWithoutLocale(), value)}${page.url.search}`, { noScroll: true });
  }
</script>

<div class="locale">
  <button
    type="button"
    class="current"
    aria-label="{translator.t('languageLabel')}: {current.label} → {next.label}"
    onclick={() => choose(next.value)}
  >
    {#key current.value}
      <span
        class="label"
        in:fly={{ x: SLIDE_PIXELS, duration }}
        out:fly={{ x: -SLIDE_PIXELS, duration }}
      >
        {current.label}
      </span>
    {/key}
  </button>

  <div class="options" role="group" aria-label={translator.t('languageLabel')}>
    {#each options as option (option.value)}
      <button
        type="button"
        class:selected={translator.current === option.value}
        aria-pressed={translator.current === option.value}
        onclick={() => choose(option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .locale {
    --pill-width: 66px;

    position: relative;
    display: inline-flex;
    flex: none;
  }

  .current {
    position: relative;
    display: none;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    width: var(--pill-width);
    height: 30px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-faint);
    font-size: 12px;
    font-weight: 600;
    transition: color var(--transition), border-color var(--transition);
  }

  .label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .options {
    display: inline-flex;
    padding: 2px;
    gap: 2px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
  }

  .options button {
    min-height: 30px;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-faint);
    transition: color var(--transition), background var(--transition);
  }

  .options .selected,
  .options .selected:hover {
    background: var(--ink);
    color: var(--bg);
  }

  @media (hover: hover) {
    .options button:hover {
      color: var(--ink);
    }

    .current:hover {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }

  @media (hover: none) {
    .current {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }

  @media (pointer: coarse) {
    .locale {
      --pill-width: 72px;
    }

    .current {
      height: 42px;
      font-size: 13px;
    }

    .options button {
      min-height: 38px;
      padding: 3px 14px;
      font-size: 13px;
    }
  }

  @media (max-width: 560px) {
    .current {
      display: inline-flex;
    }

    .options {
      display: none;
    }
  }

  @media (max-width: 420px) {
    .locale {
      --pill-width: 66px;
    }

    .current {
      height: 36px;
      font-size: 12px;
    }
  }
</style>
