<script lang="ts">
  import { tick } from 'svelte';
  import type { Outage } from '$lib/domain/outage';
  import type { Utility } from '$lib/domain/utility';
  import { activeGroups, groupByDay, pastGroups } from '$lib/time/outageSchedule';
  import { translator } from '$lib/i18n/translator.svelte';
  import EmptyState from './EmptyState.svelte';
  import OutageRow from './OutageRow.svelte';

  let {
    outages,
    utility,
    cityName,
    highlightedId = null,
    unwatched = false
  }: {
    outages: Outage[];
    utility: Utility;
    cityName: string;
    highlightedId?: string | null;
    unwatched?: boolean;
  } = $props();

  let showsHistory = $state(false);
  let panel = $state<HTMLElement | null>(null);

  const groups = $derived(groupByDay(outages));
  const upcoming = $derived(activeGroups(groups));
  const recent = $derived(pastGroups(groups));

  const isHighlightPast = $derived(
    highlightedId !== null &&
      recent.some((group) => group.outages.some((outage) => outage.id === highlightedId))
  );

  // An outage that already happened lives behind the history toggle, so a notification
  // opened late would otherwise land on a row nobody can see.
  $effect(() => {
    if (isHighlightPast) {
      showsHistory = true;
    }
  });

  $effect(() => {
    const id = highlightedId;

    if (!id || !panel) {
      return;
    }

    // Waits for the utility switch and the history toggle above to render their rows.
    tick().then(() => {
      panel
        ?.querySelector(`[data-outage-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  });
</script>

<section class="panel" bind:this={panel}>
  {#if upcoming.length === 0}
    <EmptyState
      title={translator.t(unwatched ? 'panelUnwatchedTitle' : 'panelEmptyTitle')}
      detail={translator.t(unwatched ? 'panelUnwatchedDetail' : 'panelEmptyDetail')}
      wraps={unwatched}
    />
  {:else}
    {#each upcoming as group (group.date)}
      <div class="day">
        <h3>
          <span class="heading">{translator.dayHeading(group.relation, group.date)}</span>
          <span class="detail numeric">{translator.longDate(group.date)}</span>
        </h3>
        <div class="rows">
          {#each group.outages as outage (outage.id)}
            <OutageRow {outage} {cityName} highlighted={outage.id === highlightedId} />
          {/each}
        </div>
      </div>
    {/each}
  {/if}

  {#if recent.length > 0}
    <div class="history">
      <button type="button" onclick={() => (showsHistory = !showsHistory)}>
        {translator.t(showsHistory ? 'recentHide' : 'recentShow')}
        <span class="count numeric">{recent.reduce((total, group) => total + group.outages.length, 0)}</span>
      </button>

      {#if showsHistory}
        {#each recent as group (group.date)}
          <div class="day past">
            <h3>
              <span class="heading">{translator.dayHeading(group.relation, group.date)}</span>
              <span class="detail numeric">{translator.longDate(group.date)}</span>
            </h3>
            <div class="rows">
              {#each group.outages as outage (outage.id)}
                <OutageRow {outage} {cityName} highlighted={outage.id === highlightedId} />
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</section>

<style>
  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    height: var(--table-height);
    margin-top: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow-y: auto;
  }

  .day + .day {
    border-top: 1px solid var(--border);
  }

  h3 {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: baseline;
    gap: 9px;
    margin: 0;
    padding: 11px 16px;
    background: var(--surface-sunken);
    border-bottom: 1px solid var(--border);
  }

  .heading {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .detail {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-faint);
  }

  .past h3 .heading {
    color: var(--ink-muted);
  }

  .history {
    margin-top: auto;
    border-top: 1px solid var(--border);
  }

  .history > button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-muted);
  }

  .history > button:hover {
    color: var(--ink);
    background: var(--surface-sunken);
  }

  .count {
    padding: 0 6px;
    border-radius: 999px;
    background: var(--surface-sunken);
    border: 1px solid var(--border);
    font-size: 11px;
    font-weight: 600;
  }
</style>
