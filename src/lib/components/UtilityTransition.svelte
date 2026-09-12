<script lang="ts">
  import { untrack } from 'svelte';
  import { Utility } from '$lib/domain/utility';

  let {
    utility,
    origin = null
  }: { utility: Utility; origin?: { x: number; y: number } | null } = $props();

  const start = untrack(() => origin);
  const anchor = start ? `--origin-x: ${start.x}%; --origin-y: ${start.y}%;` : '';
</script>

<span class="stage" style={anchor} aria-hidden="true">
  {#if utility === Utility.Electricity}
    <span class="flash"></span>
    <svg
      class="bolt"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--power)"
      stroke-width="1.3"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path pathLength="100" d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
      <path pathLength="100" d="m2 22 3-3" />
      <path pathLength="100" d="M7.5 13.5 10 11" />
      <path pathLength="100" d="M10.5 16.5 13 14" />
      <path pathLength="100" d="m18 3-4 4h6l-4 4" />
    </svg>
  {:else}
    <span class="ripple one"></span>
    <span class="ripple two"></span>
    <span class="ripple three"></span>
  {/if}
</span>

<style>
  .stage {
    --origin-x: 78%;
    --origin-y: 50%;

    position: absolute;
    inset: 0;
    display: block;
    overflow: hidden;
    pointer-events: none;
    border-radius: inherit;
  }

  .bolt {
    position: absolute;
    top: var(--origin-y);
    left: var(--origin-x);
    width: 46px;
    height: 46px;
    margin: -23px 0 0 -23px;
    stroke-dasharray: 100;
    animation: strike 640ms cubic-bezier(0.2, 0, 0.1, 1) forwards;
  }

  .flash {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at var(--origin-x) var(--origin-y),
      color-mix(in srgb, var(--power) 30%, transparent),
      transparent 68%
    );
    animation: glow 540ms ease-out forwards;
  }

  .ripple {
    position: absolute;
    top: var(--origin-y);
    left: var(--origin-x);
    width: 22px;
    height: 22px;
    margin: -11px 0 0 -11px;
    border: 1.5px solid var(--water);
    border-radius: 999px;
    animation: spread 700ms cubic-bezier(0.2, 0, 0.2, 1) forwards;
  }

  .two {
    animation-delay: 110ms;
  }

  .three {
    animation-delay: 220ms;
  }

  @keyframes strike {
    0% {
      stroke-dashoffset: 100;
      opacity: 0.85;
    }
    45% {
      stroke-dashoffset: 0;
      opacity: 0.85;
    }
    100% {
      stroke-dashoffset: 0;
      opacity: 0;
    }
  }

  @keyframes glow {
    0% {
      opacity: 0;
    }
    30% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes spread {
    0% {
      transform: scale(0.4);
      opacity: 0.5;
    }
    100% {
      transform: scale(4.5);
      opacity: 0;
    }
  }
</style>
