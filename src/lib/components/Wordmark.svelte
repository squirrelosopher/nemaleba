<script lang="ts">
  let { size = 18 }: { size?: number } = $props();
</script>

<span class="wordmark" style="--mark-size: {size}px">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="var(--water)" />
    <path
      d="M12 1 A11 11 0 0 1 12 23 A5.5 5.5 0 0 1 12 12 A5.5 5.5 0 0 0 12 1 Z"
      fill="var(--power)"
    />
  </svg>
  <span class="name">nemaleba<span class="tld">.rs</span></span>

</span>

<style>
  .wordmark {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--mark-size);
    letter-spacing: -0.03em;
  }

  svg {
    width: calc(var(--mark-size) * 0.8);
    height: calc(var(--mark-size) * 0.8);
    flex: none;
  }

  .tld {
    color: var(--ink-faint);
    font-weight: 500;
  }

  @media (max-width: 420px) {
    .wordmark {
      font-size: calc(var(--mark-size) - 1px);
    }

    .tld {
      display: none;
    }
  }

  /* Below this the three header controls need the whole row, so the mark carries
     the brand on its own. It still links home. */
  @media (max-width: 359px) {
    .name {
      display: none;
    }
  }
</style>
