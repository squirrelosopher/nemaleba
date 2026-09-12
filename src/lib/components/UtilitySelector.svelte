<script lang="ts">
  import { Droplets, Zap } from '@lucide/svelte';
  import { Utility } from '$lib/domain/utility';
  import { translator } from '$lib/i18n/translator.svelte';
  import UtilityTransition from './UtilityTransition.svelte';

  let {
    selected,
    counts,
    onSelect
  }: {
    selected: Utility;
    counts: Record<Utility, number>;
    onSelect: (utility: Utility) => void;
  } = $props();

  const tiles = [
    { utility: Utility.Electricity, labelKey: 'electricity', icon: Zap },
    { utility: Utility.Water, labelKey: 'water', icon: Droplets }
  ] as const;

  const ANIMATION_MS = 1000;

  let tapOrigin = $state<{ x: number; y: number } | null>(null);

  // The flourish answers a tap, so it is keyed on the tap rather than on which tile is
  // selected. Keyed on the selection it also played on arrival: the prerendered page
  // carries whichever panel the markup was built with, and a reader who had left the
  // page on water watched electricity strike, then water ripple in as the remembered
  // choice reached the client.
  let struck = $state<Utility | null>(null);

  function choose(utility: Utility, event: MouseEvent): void {
    if (utility === selected) {
      return;
    }

    const tile = event.currentTarget as HTMLButtonElement;
    const box = tile.getBoundingClientRect();

    tapOrigin =
      event.detail === 0
        ? null
        : {
            x: ((event.clientX - box.left) / box.width) * 100,
            y: ((event.clientY - box.top) / box.height) * 100
          };

    struck = utility;
    onSelect(utility);

    setTimeout(() => {
      struck = null;
      tapOrigin = null;
    }, ANIMATION_MS);
  }
</script>

<div class="tiles">
  {#each tiles as tile (tile.utility)}
    {@const count = counts[tile.utility]}
    <button
      type="button"
      class="tile {tile.utility}"
      data-utility={tile.utility}
      class:selected={selected === tile.utility}
      aria-pressed={selected === tile.utility}
      onclick={(event) => choose(tile.utility, event)}
    >
      {#if struck === tile.utility}
        <UtilityTransition utility={tile.utility} origin={tapOrigin} />
      {/if}

      <span class="head">
        <tile.icon size={15} strokeWidth={2.4} />
        <span class="label">{translator.t(tile.labelKey)}</span>
      </span>
      <span class="status" class:clear={count === 0}>
        {count === 0 ? translator.t('noOutages') : translator.outageCount(count)}
      </span>
    </button>
  {/each}
</div>

<style>
  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  /* The selected look is four custom properties rather than four rules, because two
     things decide it and only one of them is Svelte. The page is prerendered with
     whichever utility the markup was built for, so a reader who had left this city on
     water arrived to an orange electricity tile and watched it change; the mark on the
     root says otherwise before the first paint, and can only say it once here. */
  .tile {
    --tile-border: var(--border);
    --tile-surface: var(--surface);
    --tile-accent: var(--ink-faint);
    --tile-label: var(--ink-faint);

    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 14px 16px 15px;
    text-align: left;
    background: var(--tile-surface);
    border: 1px solid var(--tile-border);
    border-radius: var(--radius);
    transition: border-color var(--transition), background var(--transition);
  }

  .tile:hover {
    --tile-border: var(--border-strong);
  }

  .electricity.selected,
  :root[data-panel='electricity'] .tile[data-utility='electricity'] {
    --tile-border: var(--power-line);
    --tile-surface: var(--power-soft);
    --tile-accent: var(--power);
    --tile-label: var(--ink-muted);
  }

  .water.selected,
  :root[data-panel='water'] .tile[data-utility='water'] {
    --tile-border: var(--water-line);
    --tile-surface: var(--water-soft);
    --tile-accent: var(--water);
    --tile-label: var(--ink-muted);
  }

  /* Where the mark disagrees with the markup, it outranks it: the tile Svelte rendered as
     selected is put back to plain until hydration takes the choice over. */
  :root[data-panel='water'] .tile.selected[data-utility='electricity'],
  :root[data-panel='electricity'] .tile.selected[data-utility='water'] {
    --tile-border: var(--border);
    --tile-surface: var(--surface);
    --tile-accent: var(--ink-faint);
    --tile-label: var(--ink-faint);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--tile-accent);
    transition: color var(--transition);
  }

  .label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--tile-label);
  }

  .status {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: var(--ink);
  }

  .status.clear {
    color: var(--ink-muted);
    font-weight: 500;
  }

  .selected .status {
    color: var(--ink);
  }

  @media (hover: none) {
    .tile.selected:active {
      opacity: 1;
    }
  }
</style>
