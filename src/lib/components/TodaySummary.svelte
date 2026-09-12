<script lang="ts">
  import { href } from '$lib/i18n/routing';
  import { ArrowDown, ArrowUp, Droplets, Zap } from '@lucide/svelte';
  import type { AffectedCity, DailySummary } from '$lib/domain/city';
  import { translator } from '$lib/i18n/translator.svelte';

  let { summary }: { summary: DailySummary } = $props();

  const SortColumn = { Name: 'name', Count: 'count' } as const;
  type SortColumn = (typeof SortColumn)[keyof typeof SortColumn];

  const SortDirection = { Ascending: 'asc', Descending: 'desc' } as const;
  type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

  const DEFAULT_DIRECTION: Record<SortColumn, SortDirection> = {
    [SortColumn.Name]: SortDirection.Ascending,
    [SortColumn.Count]: SortDirection.Descending
  };

  let column = $state<SortColumn>(SortColumn.Name);
  let direction = $state<SortDirection>(SortDirection.Ascending);

  const totalOf = (city: AffectedCity) => city.electricityOutages + city.waterOutages;

  const sorted = $derived.by(() => {
    const sign = direction === SortDirection.Ascending ? 1 : -1;

    return [...summary.affected].sort((left, right) => {
      const comparison =
        column === SortColumn.Name
          ? translator.place(left.nameCyrillic).localeCompare(translator.place(right.nameCyrillic), 'sr')
          : totalOf(left) - totalOf(right);

      return comparison * sign;
    });
  });

  function sortBy(next: SortColumn): void {
    if (column === next) {
      direction =
        direction === SortDirection.Ascending ? SortDirection.Descending : SortDirection.Ascending;
      return;
    }

    column = next;
    direction = DEFAULT_DIRECTION[next];
  }

  function ariaSort(target: SortColumn): 'ascending' | 'descending' | 'none' {
    if (column !== target) {
      return 'none';
    }

    return direction === SortDirection.Ascending ? 'ascending' : 'descending';
  }
</script>

<section class="today">
  <div class="totals">
    <p class="eyebrow">{translator.t('todayHeading')}</p>
    <div class="counts">
      <span class="count power">
        <Zap size={14} strokeWidth={2.4} />
        <span class="numeric">
          <b>{summary.electricityOutages}</b>
          <span class="noun">{translator.outageNoun(summary.electricityOutages)}</span>
        </span>
      </span>
      <span class="count water">
        <Droplets size={14} strokeWidth={2.4} />
        <span class="numeric">
          <b>{summary.waterOutages}</b>
          <span class="noun">{translator.outageNoun(summary.waterOutages)}</span>
        </span>
      </span>
    </div>
  </div>

  <div class="frame">
    {#if sorted.length > 0}
      <table>
      <thead>
        <tr>
          <th scope="col" aria-sort={ariaSort(SortColumn.Name)}>
            <button type="button" onclick={() => sortBy(SortColumn.Name)}>
              {translator.t('columnMunicipality')}
              {#if column === SortColumn.Name}
                {#if direction === SortDirection.Ascending}
                  <ArrowUp size={12} strokeWidth={2.4} />
                {:else}
                  <ArrowDown size={12} strokeWidth={2.4} />
                {/if}
              {/if}
            </button>
          </th>
          <th scope="col" class="numeric-column" aria-sort={ariaSort(SortColumn.Count)}>
            <button type="button" class="trailing" onclick={() => sortBy(SortColumn.Count)}>
              {translator.t('columnOutages')}
              {#if column === SortColumn.Count}
                {#if direction === SortDirection.Ascending}
                  <ArrowUp size={12} strokeWidth={2.4} />
                {:else}
                  <ArrowDown size={12} strokeWidth={2.4} />
                {/if}
              {/if}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each sorted as city (city.id)}
          <tr>
            <td>
              <a href={href(`/${city.id}`)}>{translator.place(city.nameCyrillic)}</a>
            </td>
            <td class="numeric-column">
              <span class="marks numeric">
                {#if city.electricityOutages > 0}
                  <span class="mark power">
                    <Zap size={11} strokeWidth={2.6} />
                    <span class="value">{city.electricityOutages}</span>
                  </span>
                {/if}
                {#if city.waterOutages > 0}
                  <span class="mark water">
                    <Droplets size={11} strokeWidth={2.6} />
                    <span class="value">{city.waterOutages}</span>
                  </span>
                {/if}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
      </table>
    {:else}
      <p class="clear">{translator.t('noneToday')}</p>
    {/if}
  </div>
</section>

<style>
  .today {
    margin-top: 52px;
    padding-top: 22px;
    border-top: 1px solid var(--border);
  }

  .totals {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 16px;
  }

  .counts {
    display: flex;
    gap: 20px;
  }

  .count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.015em;
  }

  .count.power {
    color: var(--power);
  }

  .count.water {
    color: var(--water);
  }

  .count b {
    font-weight: 700;
  }

  /* On a phone the eyebrow already says what these are; the repeated noun
     just pushes the two figures apart. */
  @media (max-width: 560px) {
    .noun {
      display: none;
    }

    .counts {
      gap: 14px;
    }
  }

  /* Rows stay quiet until pointed at, so a long list reads as one block rather
     than a field of colour. The totals above carry the colour permanently. */
  .mark {
    color: var(--ink-faint);
    transition: color var(--transition);
  }

  @media (hover: hover) {
    tbody tr:hover .mark.power {
      color: var(--power);
    }

    tbody tr:hover .mark.water {
      color: var(--water);
    }
  }

  .frame {
    display: flex;
    flex-direction: column;
    max-height: var(--table-height);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    overflow-y: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 0;
    background: var(--surface-sunken);
    border-bottom: 1px solid var(--border);
    text-align: left;
  }

  th button {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 40px;
    padding: 9px 15px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
    transition: color var(--transition);
  }

  @media (hover: hover) {
    th button:hover {
      color: var(--ink);
    }
  }

  @media (hover: none) {
    th button {
      color: var(--ink);
    }
  }

  .trailing {
    justify-content: flex-end;
  }

  .numeric-column {
    text-align: right;
  }

  td {
    padding: 0;
    border-top: 1px solid var(--border);
  }

  /* The row is the click target, but the anchor stays the real link so keyboard
     focus, middle-click and open-in-new-tab all keep working. */
  tbody tr {
    position: relative;
    cursor: pointer;
  }

  td a::after {
    content: '';
    position: absolute;
    inset: 0;
  }

  tbody tr:first-child td {
    border-top: none;
  }

  @media (hover: hover) {
    tbody tr:hover {
      background: var(--surface-sunken);
    }
  }

  td a {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 11px 15px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
  }

  .marks {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 11px 15px;
    font-size: 12px;
    font-weight: 600;
  }

  .mark {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .count .numeric,
  .value {
    color: var(--ink);
  }

  .clear {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 36px 24px;
    font-size: 13px;
    color: var(--ink-muted);
  }
</style>
