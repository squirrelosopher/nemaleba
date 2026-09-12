<script lang="ts">
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { href } from '$lib/i18n/routing';
  import { Search, CornerDownLeft, Signpost } from '@lucide/svelte';
  import type { City } from '$lib/domain/city';
  import { searchCities } from '$lib/search/citySearch';
  import { searchStreets, type StreetHit } from '$lib/search/streetSearch';
  import { toSlug } from '$lib/text/serbianScript';
  import type { MessageKey } from '$lib/i18n/messages';
  import { translator } from '$lib/i18n/translator.svelte';

  export type SearchVariant = 'hero' | 'inline';

  let {
    cities,
    variant = 'hero',
    placeholderKey = 'searchPlaceholder'
  }: { cities: City[]; variant?: SearchVariant; placeholderKey?: MessageKey } = $props();

  let query = $state('');
  let isOpen = $state(false);
  let activeIndex = $state(0);
  let input: HTMLInputElement | undefined = $state();
  let streets = $state<StreetHit[]>([]);

  const cityMatches = $derived(searchCities(cities, query));
  const isBranch = (city: City) => city.branchCyrillic === city.nameCyrillic;

  // Streets arrive from a fetched shard, so they trail the city matches by a moment. The
  // list is keyed and ordered cities first, which keeps what is already on screen still
  // while the rest lands underneath it.
  const results = $derived([
    ...cityMatches.map((city) => ({ kind: 'city' as const, city, key: city.id })),
    ...streets.map((street) => ({
      kind: 'street' as const,
      street,
      key: `${street.cityId}/${toSlug(street.name)}`
    }))
  ]);

  const cityOf = (id: string) => cities.find((candidate) => candidate.id === id);

  $effect(() => {
    const asked = query;

    if (asked.length === 0) {
      streets = [];
      return;
    }

    let current = true;

    searchStreets(fetch, base, asked).then((found) => {
      if (current) {
        streets = found;
      }
    });

    return () => {
      current = false;
    };
  });

  function open(): void {
    isOpen = true;
    activeIndex = 0;
  }

  function close(): void {
    isOpen = false;
  }

  type Result = (typeof results)[number];

  function go(path: string): void {
    close();
    query = '';
    streets = [];
    input?.blur();
    goto(href(path));
  }

  function choose(result: Result): void {
    if (result.kind === 'city') {
      go(`/${result.city.id}`);
      return;
    }

    go(`/${result.street.cityId}/ulica/${toSlug(result.street.name)}`);
  }

  function move(step: number): void {
    if (results.length === 0) {
      return;
    }

    activeIndex = (activeIndex + step + results.length) % results.length;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      open();
      move(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    const chosen = results[activeIndex];

    if (chosen) {
      event.preventDefault();
      choose(chosen);
    }
  }
</script>

<div class="search" class:hero={variant === 'hero'} onfocusout={(event) => {
  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
    close();
  }
}}>
  <div class="field">
    <Search size={variant === 'hero' ? 20 : 17} strokeWidth={2} />
    <input
      bind:this={input}
      bind:value={query}
      type="search"
      autocomplete="off"
      spellcheck="false"
      placeholder={translator.t(placeholderKey)}
      aria-label={translator.t('searchLabel')}
      aria-expanded={isOpen && results.length > 0}
      role="combobox"
      aria-controls="city-suggestions"
      oninput={open}
      onfocus={open}
      onkeydown={onKeydown}
    />
  </div>

  {#if isOpen && results.length > 0}
    <ul id="city-suggestions" role="listbox">
      {#each results as result, index (result.key)}
        <li>
          <button
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            class:active={index === activeIndex}
            onmouseenter={() => (activeIndex = index)}
            onclick={() => choose(result)}
          >
            <span class="label">
              {#if result.kind === 'city'}
                <span class="city">{translator.place(result.city.nameCyrillic)}</span>
                {#if !isBranch(result.city)}
                  <span class="branch">{translator.place(result.city.branchCyrillic)}</span>
                {/if}
              {:else}
                <Signpost size={13} strokeWidth={2} />
                <span class="city">{translator.place(result.street.name)}</span>
                <!-- A street name repeats across the country, so the place it is in is
                     part of the answer rather than a decoration. -->
                <span class="branch">
                  {translator.place(cityOf(result.street.cityId)?.nameCyrillic ?? '')}
                </span>
              {/if}
            </span>
            {#if index === activeIndex}
              <CornerDownLeft size={14} strokeWidth={2} />
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* A stacking context of its own, so the suggestions are above whatever the page paints
     after them however the browser composites it. On the homepage that is the city strip,
     which sits exactly where the list drops. */
  .search {
    position: relative;
    z-index: 20;
    width: 100%;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    height: 48px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    color: var(--ink-faint);
    transition: border-color var(--transition), box-shadow var(--transition);
  }

  .hero .field {
    height: 60px;
    padding: 0 18px;
    border-radius: 14px;
  }

  .field:focus-within {
    border-color: var(--ink);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink) 10%, transparent);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    outline: none;
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: 16px;
  }

  .hero input {
    font-size: 17px;
  }

  input::placeholder {
    color: var(--ink-faint);
  }

  input::-webkit-search-cancel-button {
    display: none;
  }

  ul {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 30;
    margin: 0;
    padding: 5px;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 12px 28px -12px rgb(0 0 0 / 0.22);
  }

  li button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 44px;
    padding: 9px 11px;
    border-radius: var(--radius-sm);
    text-align: left;
    color: var(--ink-faint);
  }

  .active {
    background: var(--surface-sunken);
  }

  .label {
    display: flex;
    align-items: baseline;
    gap: 9px;
    min-width: 0;
  }

  .city {
    color: var(--ink);
    font-weight: 500;
  }

  .branch {
    font-size: 12px;
    color: var(--ink-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
