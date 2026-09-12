<script lang="ts">
  import { Heart } from '@lucide/svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { translator } from '$lib/i18n/translator.svelte';

  const SUPPORT_URL = 'https://buymeacoffee.com/squirrelosopher';
</script>

<a
  class="support"
  href={SUPPORT_URL}
  target="_blank"
  rel="noreferrer"
  aria-label={translator.t('footerSupport')}
  use:tooltip={{ label: translator.t('footerSupport'), placement: 'bottom' }}
>
  <Heart size={15} strokeWidth={2} />
</a>

<style>
  .support {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 30px;
    height: 30px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-faint);
    transition: color var(--transition), border-color var(--transition);
  }

  .support:hover {
    color: var(--ink);
    border-color: var(--border-strong);
  }

  @media (pointer: coarse) {
    .support {
      width: 42px;
      height: 42px;
    }
  }

  @media (max-width: 420px) {
    .support {
      width: 36px;
      height: 36px;
    }
  }

  /* A touch device can never reach the hover state above, so it gets that state at rest.
     Left faint it reads as disabled, which on a desktop is fine only because the pointer
     is there to prove otherwise. */
  @media (hover: none) {
    .support {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }
</style>
