<script lang="ts">
  import { CircleHelp } from '@lucide/svelte';
  import type { Registry } from '$lib/domain/city';
  import { translator } from '$lib/i18n/translator.svelte';
  import { href } from '$lib/i18n/routing';

  let { registry }: { registry: Registry } = $props();

  // Above this many cities a gap names its source instead, since a region of electricity
  // feeds covers dozens of municipalities and a list that long reads as noise.
  const CITIES_NAMED = 3;

  const lines = $derived(
    (registry.unavailable ?? []).map((gap) => {
      const provider = registry.providers.find((candidate) => candidate.id === gap.providerId);
      const cities = gap.cityIds
        .map((id) => registry.cities.find((city) => city.id === id))
        .filter((city) => city !== undefined);

      return {
        id: gap.providerId,
        source: provider ? translator.providerName(provider) : gap.providerId,
        utility: translator.t(gap.utility).toLowerCase(),
        cities: cities.length <= CITIES_NAMED ? cities : []
      };
    })
  );
</script>

{#if lines.length > 0}
  <div class="gaps" role="status">
    <CircleHelp size={16} strokeWidth={2} />
    <div>
      <p>{translator.t('homeUnavailable')}</p>
      <ul>
        {#each lines as line (line.id)}
          <li>
            {line.source} · {line.utility}
            {#each line.cities as city (city.id)}
              · <a href={href(`/${city.id}`)}>{translator.place(city.nameCyrillic)}</a>
            {/each}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .gaps {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 24px;
    padding: 12px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--warn);
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-muted);
    text-wrap: pretty;
  }

  ul {
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink);
  }

  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
