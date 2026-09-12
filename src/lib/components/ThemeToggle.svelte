<script lang="ts">
  import { Moon, Sun } from '@lucide/svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { translator } from '$lib/i18n/translator.svelte';
  import { Theme, themePreference } from '$lib/stores/theme.svelte';

  const isDark = $derived(themePreference.current === Theme.Dark);

  function toggle(): void {
    themePreference.select(isDark ? Theme.Light : Theme.Dark);
  }
</script>

<button
  type="button"
  class="theme"
  aria-label={translator.t(isDark ? 'themeLight' : 'themeDark')}
  use:tooltip={{ label: translator.t(isDark ? 'themeLight' : 'themeDark'), placement: 'bottom' }}
  onclick={toggle}
>
  <span class="icon sun"><Sun size={15} strokeWidth={2} /></span>
  <span class="icon moon"><Moon size={15} strokeWidth={2} /></span>
</button>

<style>
  /* Both icons are rendered and the document's own theme picks one. The prerendered
     markup cannot know which theme this visitor chose, so deciding in script would show
     the wrong icon until hydration -- the light-theme reader saw a sun on an already
     light page, then watched it become a moon. The inline script in app.html stamps
     data-theme before the first paint, so keying off it means there is nothing to flip. */
  .icon {
    display: none;
  }

  :global(:root[data-theme='dark']) .sun,
  :global(:root[data-theme='light']) .moon {
    display: inline-flex;
  }

  .theme {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-faint);
    transition: color var(--transition), border-color var(--transition);
  }

  .theme:hover {
    color: var(--ink);
    border-color: var(--border-strong);
  }

  @media (pointer: coarse) {
    .theme {
      width: 42px;
      height: 42px;
    }
  }

  @media (max-width: 420px) {
    .theme {
      width: 36px;
      height: 36px;
    }
  }

  /* A touch device can never reach the hover state above, so it gets that state at rest.
     Left faint it reads as disabled, which on a desktop is fine only because the pointer
     is there to prove otherwise. */
  @media (hover: none) {
    .theme {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }
</style>
