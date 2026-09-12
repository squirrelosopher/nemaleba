<script lang="ts">
  import { href } from '$lib/i18n/routing';
  import LocaleToggle from './LocaleToggle.svelte';
  import NotificationsButton from './NotificationsButton.svelte';
  import SupportButton from './SupportButton.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import Wordmark from './Wordmark.svelte';
</script>

<header>
  <div class="shell bar">
    <a href={href('/')} aria-label="nemaleba.rs">
      <Wordmark />
    </a>
    <div class="controls">
      <LocaleToggle />
      <SupportButton />
      <NotificationsButton />
      <ThemeToggle />
    </div>
  </div>
</header>

<style>
  header {
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: saturate(180%) blur(12px);
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 58px;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
  }

  @media (max-width: 420px) {
    .bar {
      gap: 8px;
    }

    .controls {
      gap: 6px;
    }
  }
</style>
