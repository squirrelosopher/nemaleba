<script lang="ts">
  import { Droplets, Zap } from '@lucide/svelte';
  import type { DailyTotals } from '$lib/domain/city';
  import { tooltip } from '$lib/actions/tooltip';
  import { translator } from '$lib/i18n/translator.svelte';

  let {
    history,
    today,
    heading
  }: { history: DailyTotals[]; today: string; heading: string } = $props();

  const SHOWN_DAYS = 7;
  const MINIMUM_DAYS = 2;

  const VIEW_WIDTH = 320;
  const VIEW_HEIGHT = 96;
  const TOP_PADDING = 10;
  const BOTTOM_PADDING = 8;

  const days = $derived(history.filter((entry) => entry.date < today).slice(-SHOWN_DAYS));

  const enough = $derived(days.length >= MINIMUM_DAYS);

  const peak = $derived(
    Math.max(0, ...days.map((day) => Math.max(day.electricityOutages, day.waterOutages)))
  );

  function roundedCeiling(value: number): number {
    const step = value <= 10 ? 2 : value <= 50 ? 10 : 20;
    return Math.max(step, Math.ceil(value / step) * step);
  }

  const ceiling = $derived(roundedCeiling(peak));
  const ticks = $derived([ceiling, ceiling / 2, 0]);

  const electricityTotal = $derived(days.reduce((sum, day) => sum + day.electricityOutages, 0));
  const waterTotal = $derived(days.reduce((sum, day) => sum + day.waterOutages, 0));

  function x(index: number): number {
    return days.length === 1 ? VIEW_WIDTH / 2 : (index * VIEW_WIDTH) / (days.length - 1);
  }

  function y(value: number): number {
    const usable = VIEW_HEIGHT - TOP_PADDING - BOTTOM_PADDING;
    return VIEW_HEIGHT - BOTTOM_PADDING - (value / ceiling) * usable;
  }

  function line(pick: (day: DailyTotals) => number): string {
    return days.map((day, index) => `${x(index)},${y(pick(day))}`).join(' ');
  }

  const electricityLine = $derived(line((day) => day.electricityOutages));
  const waterLine = $derived(line((day) => day.waterOutages));

  function percentX(index: number): number {
    return (x(index) / VIEW_WIDTH) * 100;
  }

  function percentY(value: number): number {
    return (y(value) / VIEW_HEIGHT) * 100;
  }

  function shortDate(iso: string): string {
    const [, month, day] = iso.split('-');
    return `${Number(day)}.${Number(month)}.`;
  }

  function powerLabel(day: DailyTotals): string {
    return translator.t('historyPointPower', {
      date: shortDate(day.date),
      count: translator.outageCount(day.electricityOutages)
    });
  }

  function waterLabel(day: DailyTotals): string {
    return translator.t('historyPointWater', {
      date: shortDate(day.date),
      count: translator.outageCount(day.waterOutages)
    });
  }
</script>

<section class="history">
  <div class="totals">
    <p class="eyebrow">{heading}</p>
    {#if enough}
      <div class="counts">
        <span class="count power">
          <Zap size={14} strokeWidth={2.4} />
          <span class="numeric">
            <b>{electricityTotal}</b>
            <span class="noun">{translator.outageNoun(electricityTotal)}</span>
          </span>
        </span>
        <span class="count water">
          <Droplets size={14} strokeWidth={2.4} />
          <span class="numeric">
            <b>{waterTotal}</b>
            <span class="noun">{translator.outageNoun(waterTotal)}</span>
          </span>
        </span>
      </div>
    {/if}
  </div>

  <div class="frame">
    {#if enough}
      <div class="chart">
        <div class="scale numeric">
          {#each ticks as tick (tick)}
            <span style="top: {percentY(tick)}%">{tick}</span>
          {/each}
        </div>

        <div class="plot">
          {#each ticks as tick (tick)}
            <span class="grid" style="top: {percentY(tick)}%"></span>
          {/each}

          <svg
            viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
            preserveAspectRatio="none"
            role="img"
            aria-label={translator.t('historyChartLabel')}
          >
            <polyline class="water-line" points={waterLine} vector-effect="non-scaling-stroke" />
            <polyline
              class="power-line"
              points={electricityLine}
              vector-effect="non-scaling-stroke"
            />
          </svg>

          <ul class="legend">
            <li><span class="swatch power"></span>{translator.t('electricity')}</li>
            <li><span class="swatch water"></span>{translator.t('water')}</li>
          </ul>

          {#each days as day, index (day.date)}
            <button
              type="button"
              class="dot water-dot"
              style="left: {percentX(index)}%; top: {percentY(day.waterOutages)}%"
              aria-label={waterLabel(day)}
              use:tooltip={{ label: waterLabel(day), tappable: true }}
            ></button>
            <button
              type="button"
              class="dot power-dot"
              style="left: {percentX(index)}%; top: {percentY(day.electricityOutages)}%"
              aria-label={powerLabel(day)}
              use:tooltip={{ label: powerLabel(day), tappable: true }}
            ></button>
          {/each}
        </div>

        <div class="axis numeric">
          {#each days as day (day.date)}
            <span>{shortDate(day.date)}</span>
          {/each}
        </div>
      </div>
    {:else}
      <p class="empty">{translator.t('historyEmpty')}</p>
    {/if}
  </div>
</section>

<style>
  .history {
    margin-top: 40px;
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

  .eyebrow {
    margin: 0;
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

  .count .numeric {
    color: var(--ink);
  }

  .count b {
    font-weight: 700;
  }

  .frame {
    padding: 16px 16px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .chart {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 10px;
  }

  .scale {
    position: relative;
    grid-column: 1;
    grid-row: 1;
    min-width: 18px;
    height: 96px;
  }

  .scale span {
    position: absolute;
    right: 0;
    transform: translateY(-50%);
    font-size: 11px;
    color: var(--ink-faint);
  }

  .plot {
    position: relative;
    grid-column: 2;
    grid-row: 1;
    height: 96px;
  }

  .grid {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
  }

  svg {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  polyline {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .power-line {
    stroke: var(--power);
  }

  .water-line {
    stroke: var(--water);
  }

  /* In the corner of the plot, on a plug of the page's own background so a line passing
     behind it stays visible without taking the words with it. */
  .legend {
    position: absolute;
    top: -6px;
    right: -6px;
    display: flex;
    gap: 12px;
    margin: 0;
    padding: 5px 8px;
    list-style: none;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--bg) 60%, transparent);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-muted);
    pointer-events: none;
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* The same mark the chart puts on each day, at the same size. */
  .swatch {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .swatch.power {
    background: var(--power);
  }

  .swatch.water {
    background: var(--water);
  }

  .dot {
    position: absolute;
    width: 6px;
    height: 6px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: box-shadow var(--transition);
  }

  .dot::after {
    content: '';
    position: absolute;
    inset: -11px;
    border-radius: 50%;
  }

  .power-dot {
    background: var(--power);
    color: var(--power);
  }

  .water-dot {
    background: var(--water);
    color: var(--water);
  }

  .dot:hover,
  .dot:focus-visible {
    box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 26%, transparent);
  }

  .axis {
    display: flex;
    grid-column: 2;
    grid-row: 2;
    justify-content: space-between;
    margin-top: 10px;
    font-size: 11px;
    color: var(--ink-faint);
  }

  .empty {
    margin: 0;
    padding: 22px 0;
    text-align: center;
    font-size: 12.5px;
    color: var(--ink-muted);
  }

  @media (max-width: 560px) {
    .noun {
      display: none;
    }

    .counts {
      gap: 14px;
    }

    .axis {
      font-size: 10px;
    }
  }
</style>
