<script lang="ts">
  import { onMount } from 'svelte';
  import { href } from '$lib/i18n/routing';
  import { Inbox } from '@lucide/svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import { translator } from '$lib/i18n/translator.svelte';
  import { notificationLog } from '$lib/notifications/notificationLog.svelte';

  let loaded = $state(false);

  $effect(() => {
    if (loaded) {
      delete document.documentElement.dataset.unread;
    }
  });

  onMount(() => {
    notificationLog.load().then(() => (loaded = true));

    if (!('serviceWorker' in navigator)) {
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'nemaleba:notification') {
        notificationLog.load();
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);

    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  });
</script>

<a
  class="inbox"
  href={href('/obavestenja')}
  aria-label={translator.t('notificationsTitle')}
  use:tooltip={{ label: translator.t('notificationsTitle'), placement: 'bottom' }}
>
  <Inbox size={15} strokeWidth={2} />
  <span class="dot" class:on={loaded && notificationLog.hasUnread} aria-hidden="true"></span>
</a>

<style>
  .inbox {
    position: relative;
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

  .dot {
    display: none;
    position: absolute;
    top: 4px;
    right: 4px;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--alert);
    box-shadow: 0 0 0 2px var(--surface);
  }

  .dot.on,
  :global(:root[data-unread]) .dot {
    display: block;
  }

  @media (hover: hover) {
    .inbox:hover {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }

  @media (hover: none) {
    .inbox {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }

  @media (pointer: coarse) {
    .inbox {
      width: 42px;
      height: 42px;
    }

    .dot {
      top: 8px;
      right: 8px;
    }
  }

  @media (max-width: 420px) {
    .inbox {
      width: 36px;
      height: 36px;
    }

    .dot {
      top: 6px;
      right: 6px;
    }
  }
</style>
