<script lang="ts">
  import CityMarquee from '$lib/components/CityMarquee.svelte';
  import CitySearch from '$lib/components/CitySearch.svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import TodaySummary from '$lib/components/TodaySummary.svelte';
  import HistorySummary from '$lib/components/HistorySummary.svelte';
  import { translator } from '$lib/i18n/translator.svelte';

  let { data } = $props();
</script>

<MetaTags
  title={translator.t('metaHomeTitle')}
  description={translator.t('metaHomeDescription')}
/>

<div class="shell hero">
  <p class="eyebrow">{translator.t('tagline')}</p>

  <h1>
    {translator.t('heroLead')}
    <span class="power">{translator.t('heroWordPower')}</span>
    {translator.t('heroConjunction')}
    <span class="water">{translator.t('heroWordWater')}</span>?
  </h1>

  <p class="lede">
    <span>{translator.t('heroLedePrimary')}</span>
    <span>{translator.t('heroLedeSecondary')}</span>
  </p>

  <div class="finder">
    <CitySearch cities={data.registry.cities} />
  </div>
</div>

<div class="shell strip">
  <CityMarquee cities={data.registry.cities} />
</div>

<div class="shell">
  <TodaySummary summary={data.registry.summary} />
  <HistorySummary
    history={data.registry.history ?? []}
    today={data.registry.summary.date}
    heading={translator.t('historyHeading')}
  />
</div>

<style>
  .hero {
    padding-top: 68px;
  }

  h1 {
    margin: 12px 0 0;
    font-size: clamp(34px, 6vw, 46px);
    letter-spacing: -0.035em;
    text-wrap: balance;
  }

  h1 .power {
    color: var(--power);
  }

  h1 .water {
    color: var(--water);
  }

  .lede {
    margin: 12px 0 0;
    font-size: 16px;
    color: var(--ink-muted);
    text-wrap: pretty;
  }

  .lede span {
    display: block;
  }

  .finder {
    margin-top: 30px;
    max-width: 520px;
  }

  .strip {
    margin-top: 18px;
  }

  @media (max-width: 560px) {
    .hero {
      padding-top: 44px;
    }
  }
</style>
