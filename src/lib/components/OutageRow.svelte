<script lang="ts">
  import { CalendarClock, ExternalLink, Share2 } from '@lucide/svelte';
  import type { Outage } from '$lib/domain/outage';
  import { OutageKind, Utility } from '$lib/domain/utility';
  import { tooltip } from '$lib/actions/tooltip';
  import { translator } from '$lib/i18n/translator.svelte';

  let {
    outage,
    cityName,
    highlighted = false
  }: { outage: Outage; cityName: string; highlighted?: boolean } = $props();

  const LONG_STREET_LIST = 170;
  const EXTRA_DETAIL_MARGIN = 24;

  let isExpanded = $state(false);

  const streetLine = $derived(outage.streets.join(' · '));
  const bodyText = $derived(streetLine || outage.note || '');
  const showsArea = $derived(outage.areaLabel !== cityName);

  // Every electricity outage is planned, so marking those would flag every row. Water
  // carries both kinds, which is where the distinction earns its place.
  const showsPlannedMark = $derived(
    outage.utility === Utility.Water && outage.kind === OutageKind.Planned
  );

  const summarised = $derived(`${streetLine}${outage.reason ?? ''}`.length);
  const hasOriginal = $derived(
    Boolean(outage.note) && streetLine.length > 0 && outage.note!.length > summarised + EXTRA_DETAIL_MARGIN
  );
  const isLong = $derived(bodyText.length > LONG_STREET_LIST);
  const canExpand = $derived(isLong || hasOriginal);

  const shareTitle = $derived(
    translator.t(
      outage.utility === Utility.Electricity ? 'shareTitleElectricity' : 'shareTitleWater',
      { city: translator.place(cityName) }
    )
  );

  function shareBody(): string {
    const when = outage.time ? translator.timeWindow(outage.time) : translator.t('allDay');
    const where = translator.place(streetLine || outage.areaLabel);

    return [
      `${translator.longDate(outage.date)} · ${when}`,
      where
    ].join('\n');
  }

  async function share(): Promise<void> {
    const payload = {
      title: shareTitle,
      text: shareBody(),
      url: `${location.origin}${location.pathname}?outage=${outage.id}`
    };

    if (navigator.canShare && !navigator.canShare(payload)) {
      return;
    }

    try {
      await navigator.share(payload);
    } catch {
      return;
    }
  }
</script>

<article
  class="row {outage.utility}"
  class:highlighted
  data-outage-id={outage.id}
>
  <div class="time numeric">
    {#if outage.time}
      <span class="range">{translator.timeWindow(outage.time)}</span>
    {:else}
      <span class="allday">{translator.t('allDay')}</span>
    {/if}
  </div>

  <div class="body">
    {#if showsArea}
      <div class="meta">
        <span class="area">{translator.place(outage.areaLabel)}</span>
      </div>
    {/if}

    {#if bodyText}
      <p class="streets" class:clamped={isLong && !isExpanded}>
        {translator.place(bodyText)}
      </p>
    {/if}

    {#if outage.reason}
      <p class="reason">{translator.place(outage.reason)}</p>
    {/if}

    {#if canExpand}
      <button type="button" class="reveal" onclick={() => (isExpanded = !isExpanded)}>
        {translator.t(isExpanded ? 'showLess' : 'showMore')}
      </button>
    {/if}

    {#if isExpanded && hasOriginal && outage.note}
      <p class="original">{translator.place(outage.note)}</p>
    {/if}
  </div>

  <div class="actions">
    {#if showsPlannedMark}
      <button
        type="button"
        class="kind"
        aria-label={translator.t('plannedWorks')}
        use:tooltip={{ label: translator.t('plannedWorks'), tappable: true }}
      >
        <CalendarClock size={14} strokeWidth={2} />
      </button>
    {/if}

    <a
      class="source"
      href={outage.sourceUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={translator.t('openSource')}
      use:tooltip={{ label: translator.t('openSource') }}
    >
      <ExternalLink size={14} strokeWidth={2} />
    </a>

    <button
      type="button"
      class="share"
      aria-label={translator.t('shareOutage')}
      use:tooltip={{ label: translator.t('shareOutage') }}
      onclick={share}
    >
      <Share2 size={14} strokeWidth={2} />
    </button>
  </div>
</article>

<style>
  .row {
    display: grid;
    grid-template-columns: 116px 1fr auto;
    align-items: baseline;
    gap: 16px;
    padding: 15px 16px;
  }

  /* Arriving from a notification, the row this one is about blinks in its own utility's
     accent — the same colour that marks the tile above it — so the eye lands on the
     right line without a permanent marker left behind afterwards. */
  .electricity {
    --flash-tint: color-mix(in srgb, var(--power) 16%, transparent);
    --flash-edge: var(--power);
  }

  .water {
    --flash-tint: color-mix(in srgb, var(--water) 16%, transparent);
    --flash-edge: var(--water);
  }

  .highlighted {
    animation: flash 780ms ease-in-out 3;
  }

  @keyframes flash {
    0%,
    100% {
      background: transparent;
      box-shadow: inset 3px 0 0 transparent;
    }

    40% {
      background: var(--flash-tint);
      box-shadow: inset 3px 0 0 var(--flash-edge);
    }
  }

  /* Blinking is the one thing reduced motion cannot have, so the tint simply stays. */
  @media (prefers-reduced-motion: reduce) {
    .highlighted {
      animation: none;
      background: var(--flash-tint);
      box-shadow: inset 3px 0 0 var(--flash-edge);
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 2px;
    align-self: start;
    margin: -5px -6px 0 0;
  }

  .row + :global(.row) {
    border-top: 1px solid var(--border);
  }

  .time {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .allday {
    color: var(--ink-faint);
    font-weight: 500;
  }

  .body {
    min-width: 0;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 18px;
    margin-bottom: 3px;
  }

  .area {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted);
  }

  .kind {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    color: var(--ink-faint);
  }

  .streets {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .clamped {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .reason {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--ink-muted);
  }

  .reveal {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    margin-top: 2px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-faint);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .reveal:hover {
    color: var(--ink);
  }

  .original {
    margin: 8px 0 0;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface-sunken);
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-muted);
  }

  .source {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    color: var(--ink-faint);
    transition: color var(--transition), background var(--transition);
  }

  .share {
    display: none;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: var(--radius-sm);
    color: var(--ink-faint);
    transition: color var(--transition), background var(--transition);
  }

  :global(:root[data-can-share]) .share {
    display: inline-flex;
  }

  :global(:root[data-can-share]) .source {
    display: none;
  }

  @media (hover: hover) {
    .source:hover,
    .share:hover {
      background: var(--surface-sunken);
      color: var(--ink);
    }
  }

  @media (hover: none) {
    .kind,
    .source,
    .share {
      color: var(--ink);
    }
  }

  @media (max-width: 560px) {
    .row {
      grid-template-columns: 1fr auto;
      gap: 4px 10px;
    }

    .time {
      grid-column: 1;
      grid-row: 1;
    }

    .actions {
      grid-column: 2;
      grid-row: 1;
      margin: -5px -6px 0 0;
    }

    .body {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
</style>
