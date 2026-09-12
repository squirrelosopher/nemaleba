<script lang="ts">
  import { href } from '$lib/i18n/routing';
  import type { City } from '$lib/domain/city';
  import { translator } from '$lib/i18n/translator.svelte';

  let { cities }: { cities: City[] } = $props();

  const SCROLL_STEP_PIXELS = 0.4;

  let track: HTMLDivElement | undefined = $state();
  let isPaused = $state(false);
  let offset = 0;

  // The scrollable distance `offset` was last measured against. Zero means it came from
  // the element itself and already agrees with whatever the strip currently measures.
  let span = 0;

  function skipsAutoScroll(): boolean {
    return (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  function advance(): void {
    if (!track || isPaused) {
      return;
    }

    const limit = track.scrollWidth - track.clientWidth;

    if (limit <= 0) {
      return;
    }

    // Switching script rewrites all 133 names, so the strip gets wider or narrower under
    // the scroll. Carried across as a proportion, the same part of the list stays in
    // view; read as a distance, a position past the new end wrapped to zero on the next
    // frame and the strip appeared to jump back to the start.
    if (span > 0 && limit !== span) {
      offset = (offset / span) * limit;
    }

    span = limit;

    const next = offset + SCROLL_STEP_PIXELS;
    offset = next >= limit ? 0 : next;
    track.scrollLeft = offset;
  }

  function pause(): void {
    isPaused = true;
  }

  function resume(): void {
    if (track) {
      offset = track.scrollLeft;
      span = 0;
    }

    isPaused = false;
  }

  $effect(() => {
    if (skipsAutoScroll()) {
      return;
    }

    let frame = 0;

    const tick = () => {
      advance();
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });
</script>

<div
  class="marquee"
  role="navigation"
  aria-label={translator.t('citiesLabel')}
  onpointerenter={pause}
  onpointerleave={resume}
  onfocusin={pause}
  onfocusout={resume}
>
  <div class="track" bind:this={track}>
    {#each cities as city (city.id)}
      <a href={href(`/${city.id}`)}>{translator.place(city.nameCyrillic)}</a>
    {/each}
  </div>
</div>

<style>
  .marquee {
    position: relative;
    width: 100%;
    --fade: 48px;
  }

  /* The edges fade under an overlay rather than a mask. A mask-image here made WebKit
     composite the whole strip into a layer of its own, and on iOS that layer both
     swallowed the track's touch scrolling and painted over the search suggestions
     dropping out of the hero above it -- so the badges showed through where the results
     belonged, and took the taps meant for them. */
  .marquee::before,
  .marquee::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: var(--fade);
    pointer-events: none;
  }

  .marquee::before {
    left: 0;
    background: linear-gradient(90deg, var(--bg), transparent);
  }

  .marquee::after {
    right: 0;
    background: linear-gradient(270deg, var(--bg), transparent);
  }

  .track {
    display: flex;
    gap: 7px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 2px 0;
  }

  .track::-webkit-scrollbar {
    display: none;
  }

  a {
    display: inline-flex;
    align-items: center;
    flex: none;
    padding: 5px 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    font-size: 13px;
    white-space: nowrap;
    color: var(--ink-muted);
    transition: border-color var(--transition), color var(--transition);
  }

  @media (hover: hover) {
    a:hover {
      border-color: var(--border-strong);
      color: var(--ink);
    }
  }

  @media (pointer: coarse) {
    .track {
      gap: 9px;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
    }

    a {
      min-height: 40px;
      padding: 5px 15px;
      font-size: 14px;
      scroll-snap-align: center;
    }
  }
</style>
