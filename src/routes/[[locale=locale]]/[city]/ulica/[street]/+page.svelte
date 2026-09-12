<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import OutageRow from '$lib/components/OutageRow.svelte';
  import { addressCandidates, foldForMatching } from '$lib/address/addressText';
  import { href } from '$lib/i18n/routing';
  import { translator } from '$lib/i18n/translator.svelte';

  let { data } = $props();

  const city = $derived(data.dataset.city);
  const folded = $derived(foldForMatching(data.street));

  // The same question the collector asks of the same text, in the browser: does this
  // announcement name the street the reader came for.
  const naming = $derived(
    data.dataset.outages.filter((outage) => {
      const text = [outage.areaLabel, ...outage.streets].join(' • ');

      return addressCandidates(text).some((candidate) => candidate === folded);
    })
  );

  const label = $derived(translator.place(data.street));
</script>

<MetaTags
  title={`${label} · ${city.nameLatin}`}
  description={translator.t('streetNamed')}
/>

<div class="shell page">
  <a class="back" href={href(`/${city.id}`)}>
    <ArrowLeft size={14} strokeWidth={2} />
    {translator.place(city.nameCyrillic)}
  </a>

  <header>
    <p class="eyebrow">{translator.t('streetHeading')}</p>
    <h1>{label}</h1>
  </header>

  {#if naming.length > 0}
    <p class="lede">{translator.t('streetNamed')}</p>

    <div class="rows">
      {#each naming as outage (outage.id)}
        <OutageRow {outage} cityName={city.nameCyrillic} />
      {/each}
    </div>
  {:else}
    <!-- Said outright rather than shown as an empty list. An announcement that describes
         its area without naming a street cannot be attributed to one, and a reader who
         reads silence here as "nothing is wrong" has been misled by us. -->
    <p class="lede">{translator.t('streetQuiet')}</p>
    <p class="caveat">{translator.t('streetQuietWhy')}</p>

    <a class="all" href={href(`/${city.id}`)}>
      {translator.t('streetSeeCity', { city: translator.place(city.nameCyrillic) })}
    </a>
  {/if}
</div>

<style>
  .page {
    padding-top: 30px;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    font-size: 12px;
    color: var(--ink-muted);
  }

  header {
    margin-top: 4px;
  }

  h1 {
    margin: 6px 0 0;
    font-size: clamp(26px, 5vw, 34px);
    letter-spacing: -0.03em;
  }

  .lede {
    margin: 16px 0 0;
    font-size: 15px;
    color: var(--ink-muted);
  }

  .caveat {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--ink-faint);
    text-wrap: pretty;
  }

  .rows {
    margin-top: 14px;
  }

  .all {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin-top: 14px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: var(--border-strong);
  }
</style>
