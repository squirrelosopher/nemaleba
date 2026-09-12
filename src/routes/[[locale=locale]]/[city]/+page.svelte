<script lang="ts">
  import { untrack } from 'svelte';
  import { base } from '$app/paths';
  import { href } from '$lib/i18n/routing';
  import { browser } from '$app/environment';
  import { afterNavigate, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { ArrowLeft, MessagesSquare } from '@lucide/svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import HistorySummary from '$lib/components/HistorySummary.svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import CitySearch from '$lib/components/CitySearch.svelte';
  import NotifyButton from '$lib/components/NotifyButton.svelte';
  import OutagePanel from '$lib/components/OutagePanel.svelte';
  import UtilitySelector from '$lib/components/UtilitySelector.svelte';
  import { coversCity } from '$lib/domain/provider';
  import { UTILITIES, Utility } from '$lib/domain/utility';
  import type { MessageKey } from '$lib/i18n/messages';
  import { translator } from '$lib/i18n/translator.svelte';
  import { dayOffsetFromToday } from '$lib/time/serbianCalendar';
  import { loadComments } from '$lib/comments/commentClient';
  import { backLink } from '$lib/navigation/backLink';
  import { panelChoice } from '$lib/navigation/panelChoice.svelte';
  import { reloadCityDataset } from '$lib/data/outageRepository';
  import type { Outage } from '$lib/domain/outage';
  import { ToastTone, toasts } from '$lib/toasts/toastStore.svelte';

  let { data } = $props();

  const HIGHLIGHT_PARAM = 'outage';
  const UTILITY_PARAM = 'utility';

  const city = $derived(data.dataset.city);

  // What the page was built with, unless a look at the source has turned up more.
  let refreshed = $state<{ city: string; outages: Outage[] } | null>(null);
  const outages = $derived(
    refreshed?.city === data.dataset.city.id ? refreshed.outages : data.dataset.outages
  );

  const counts = $derived({
    [Utility.Electricity]: countUpcoming(Utility.Electricity),
    [Utility.Water]: countUpcoming(Utility.Water)
  });

  let chosen = $state<Utility | null>(null);

  // The wall is empty most days, so a dot is the whole message: worth a tap, or not.
  // It asks after the page is up and says nothing until an answer comes back, which
  // also keeps a city page that never reaches the Worker exactly as it is today.
  let commented = $state(false);

  $effect(() => {
    const asked = city.id;
    commented = false;

    loadComments(asked)
      .then((comments) => {
        if (asked === city.id) {
          commented = comments.length > 0;
        }
      })
      .catch(() => undefined);
  });

  // A notification links to ?outage=<id>. The id is a delivery detail of one push, not
  // something worth showing in the address bar or carrying into a shared link, so it is
  // taken out again the moment it has been read -- which is also why it is held here
  // rather than read from the url on demand. Remembering which city it arrived for lets
  // it lapse on its own when the reader moves to another one.
  //
  // afterNavigate is what reads it, for two reasons: it does not run while prerendering,
  // where touching the query string is an error, and it runs once the router is up, which
  // replaceState below requires -- an effect fires too early and throws.
  let highlight = $state(
    browser ? fromSearch(location.search, untrack(() => data.dataset.city.id)) : null
  );

  // A notification names the panel it is about, so a card covering only water does not
  // open on electricity. Read, remembered and taken out of the url exactly as the outage
  // id is, and for the same reasons.
  let asked = $state(
    browser ? utilityFromSearch(location.search, untrack(() => data.dataset.city.id)) : null
  );

  afterNavigate(() => {
    const id = page.url.searchParams.get(HIGHLIGHT_PARAM);
    const utility = page.url.searchParams.get(UTILITY_PARAM);

    if (id === null && utility === null) {
      return;
    }

    if (id !== null) {
      highlight = { city: data.dataset.city.id, id };
    }

    if (isUtility(utility)) {
      asked = { city: data.dataset.city.id, utility };
    }

    const cleaned = new URL(page.url);
    cleaned.searchParams.delete(HIGHLIGHT_PARAM);
    cleaned.searchParams.delete(UTILITY_PARAM);
    replaceState(cleaned, page.state);
  });

  function isUtility(value: string | null): value is Utility {
    return UTILITIES.includes(value as Utility);
  }

  function fromSearch(search: string, cityId: string): { city: string; id: string } | null {
    const id = new URLSearchParams(search).get(HIGHLIGHT_PARAM);

    return id ? { city: cityId, id } : null;
  }

  function utilityFromSearch(
    search: string,
    cityId: string
  ): { city: string; utility: Utility } | null {
    const utility = new URLSearchParams(search).get(UTILITY_PARAM);

    return isUtility(utility) ? { city: cityId, utility } : null;
  }

  const highlightedId = $derived(highlight?.city === city.id ? highlight.id : null);
  const highlighted = $derived(outages.find((outage) => outage.id === highlightedId) ?? null);

  // The html a notification opens can be ten minutes old, so a missing id means look
  // again at the source before saying anything -- and only a source that answers and
  // still does not have it proves the outage gone, which happens when a utility edits
  // its announcement, since ids are content hashes. A source that cannot be reached
  // proves nothing, and the reader is left with the page rather than a claim.
  let chased = $state<string | null>(null);

  $effect(() => {
    const id = highlightedId;

    if (id === null || highlighted !== null || chased === id) {
      return;
    }

    chased = id;
    const asked = city.id;

    reloadCityDataset(base, asked).then((dataset) => {
      if (!dataset) {
        return;
      }

      refreshed = { city: asked, outages: dataset.outages };

      if (dataset.outages.some((outage) => outage.id === id)) {
        return;
      }

      toasts.show({
        tone: ToastTone.Notice,
        title: translator.t('outageArchivedTitle'),
        message: translator.t('outageArchived')
      });
    });
  });

  const askedUtility = $derived(asked?.city === city.id ? asked.utility : null);

  const openedUtility = $derived(
    highlighted?.utility ??
      askedUtility ??
      panelChoice.of(city.id) ??
      (counts[Utility.Electricity] === 0 && counts[Utility.Water] > 0
        ? Utility.Water
        : Utility.Electricity)
  );

  const selected = $derived(chosen ?? openedUtility);

  $effect(() => {
    city.id;
    chosen = null;
  });

  function choose(utility: Utility): void {
    chosen = utility;
    panelChoice.remember(city.id, utility);
  }

  // A notification names the panel it is about, and opening it is as deliberate as
  // tapping the tile. Only the fallback below goes unremembered: it is a guess from
  // today's counts, and holding on to it would hand a reader an empty panel on a day
  // the counts had moved.
  $effect(() => {
    const named = highlighted?.utility ?? askedUtility;

    if (named) {
      panelChoice.remember(city.id, named);
    }
  });

  // Both panels are rendered, because which one a reader wants cannot be known when the
  // page is built. Rendering only the selected one meant the prerendered markup carried
  // electricity and swapped to water once the remembered choice reached the client.
  // Together they are every outage the city has, not twice anything.
  const byUtility = $derived({
    [Utility.Electricity]: outages.filter((outage) => outage.utility === Utility.Electricity),
    [Utility.Water]: outages.filter((outage) => outage.utility === Utility.Water)
  });

  // Whether anybody publishes water for this place at all. Thirty-six of the hundred
  // and eleven cities have a water utility that does; the rest would otherwise look
  // like a town where the water never goes off.
  function watchedFor(utility: Utility): boolean {
    return data.registry.providers.some(
      (provider) => provider.utility === utility && coversCity(provider, city.id)
    );
  }

  const isBranch = $derived(city.branchCyrillic === city.nameCyrillic);

  // Back where the reader came from, whatever that was, and never back to this page.
  const back = $derived(backLink(data.registry.cities, `/${city.id}`));

  const description = $derived.by(() => {
    const phrases = [
      phraseFor('metaCountElectricity', counts[Utility.Electricity]),
      phraseFor('metaCountWater', counts[Utility.Water])
    ].filter((phrase) => phrase !== null);

    if (phrases.length === 0) {
      return translator.t('metaCityQuiet', { city: city.nameLatin });
    }

    if (phrases.length === 1) {
      return translator.t('metaCityOne', { city: city.nameLatin, outages: phrases[0] });
    }

    return translator.t('metaCityBoth', {
      city: city.nameLatin,
      electricity: phrases[0],
      water: phrases[1]
    });
  });

  function phraseFor(key: MessageKey, count: number): string | null {
    if (count === 0) {
      return null;
    }

    return translator.t(key, { count, outages: translator.outageNoun(count) });
  }

  function countUpcoming(utility: Utility): number {
    return outages.filter(
      (outage) => outage.utility === utility && dayOffsetFromToday(outage.date) >= 0
    ).length;
  }
</script>

<MetaTags
  title={translator.t('metaCityTitle', { city: city.nameLatin })}
  description={description}
/>

<div class="shell page">
  <a class="back" href={href(back.path)}>
    <ArrowLeft size={14} strokeWidth={2.2} />
    {back.label}
  </a>

  <header class="title">
    <div class="heading">
      <h1>{translator.place(city.nameCyrillic)}</h1>

      <div class="actions">
        <a
          class="comments"
          href={href(`/${city.id}/komentari`)}
          aria-label={translator.t('commentsFor', { city: translator.place(city.nameCyrillic) })}
          use:tooltip={{ label: translator.t('comments'), placement: 'bottom' }}
        >
          <MessagesSquare size={15} strokeWidth={2} />
          <span class="dot" class:on={commented} aria-hidden="true"></span>
        </a>

        <NotifyButton cityId={city.id} cityName={translator.place(city.nameCyrillic)} />
      </div>
    </div>

    {#if !isBranch}
      <p class="branch">
        {translator.t('branch', { branch: translator.place(city.branchCyrillic) })}
      </p>
    {/if}
  </header>

  <UtilitySelector {selected} {counts} onSelect={choose} />

  {#each UTILITIES as utility (utility)}
    <div class="panel" data-utility={utility} class:shown={utility === selected}>
      <OutagePanel
        outages={byUtility[utility]}
        {utility}
        cityName={city.nameCyrillic}
        highlightedId={highlighted?.id ?? null}
        unwatched={!watchedFor(utility)}
      />
    </div>
  {/each}

  <HistorySummary
    history={data.dataset.history ?? []}
    today={data.registry.summary.date}
    heading={translator.t('historyHeadingCity')}
  />

  <div class="switch">
    <p class="eyebrow">{translator.t('otherMunicipality')}</p>
    <CitySearch
      cities={data.registry.cities}
      variant="inline"
      placeholderKey="searchPlaceholderShort"
    />
  </div>
</div>

<style>
  .page {
    padding-top: 30px;
  }

  /* `shown` is Svelte's answer and governs from hydration onwards. The mark on the root
     outranks it by specificity and is removed a frame after mount, so all it ever does is
     choose which panel the very first paint shows. */
  .panel {
    display: none;
  }

  .panel.shown {
    display: block;
  }

  :root[data-panel='electricity'] .panel[data-utility='electricity'],
  :root[data-panel='water'] .panel[data-utility='water'] {
    display: block;
  }

  :root[data-panel='electricity'] .panel[data-utility='water'],
  :root[data-panel='water'] .panel[data-utility='electricity'] {
    display: none;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-faint);
    transition: color var(--transition);
  }

  @media (hover: hover) {
    .back:hover {
      color: var(--ink);
    }
  }

  @media (hover: none) {
    .back {
      color: var(--ink);
    }
  }

  .title {
    margin: 4px 0 26px;
  }

  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .actions {
    display: flex;
    align-items: center;
    flex: none;
    gap: 8px;
  }

  .comments {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 38px;
    height: 38px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-faint);
    transition: color var(--transition), border-color var(--transition);
  }

  .dot {
    display: none;
    position: absolute;
    top: 7px;
    right: 7px;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--alert);
    box-shadow: 0 0 0 2px var(--surface);
  }

  .dot.on {
    display: block;
  }

  @media (hover: hover) {
    .comments:hover {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }

  @media (hover: none) {
    .comments {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }

  @media (pointer: coarse) {
    .comments {
      width: 44px;
      height: 44px;
    }

    .dot {
      top: 9px;
      right: 9px;
    }
  }

  h1 {
    font-size: clamp(28px, 5vw, 38px);
  }

  .branch {
    margin: 5px 0 0;
    font-size: 13px;
    color: var(--ink-muted);
  }

  .switch {
    margin-top: 40px;
    max-width: 420px;
  }

  .switch .eyebrow {
    margin: 0 0 8px;
  }

  @media (max-width: 560px) {
    .heading {
      gap: 12px;
    }
  }
</style>
