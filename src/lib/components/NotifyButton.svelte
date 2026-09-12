<script lang="ts">
  import { href } from '$lib/i18n/routing';
  import { Bell, BellOff, BellRing, LoaderCircle } from '@lucide/svelte';
  import { tooltip } from '$lib/actions/tooltip';
  import {
    PushState,
    isCachedSubscription,
    isConfigured,
    isSupported,
    subscribeToCity,
    subscribedCities,
    unsubscribeFromCity
  } from '$lib/notifications/pushClient';
  import { DeliverySetup, detectDeliverySetup } from '$lib/notifications/delivery';
  import { translator } from '$lib/i18n/translator.svelte';
  import { ToastTone, toasts } from '$lib/toasts/toastStore.svelte';

  let { cityId, cityName }: { cityId: string; cityName: string } = $props();

  let pushState = $state<PushState>(PushState.Idle);
  let element = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    const identifier = cityId;

    // The inline script in app.html marked this button before the first paint. From here
    // the component's own pushState drives the look, so the mark has to go -- otherwise a
    // subscription the server has since dropped would stay showing as active.
    element?.removeAttribute('data-subscribed');

    if (!isSupported()) {
      pushState =
        detectDeliverySetup() === DeliverySetup.NeedsHomeScreen
          ? PushState.NeedsHomeScreen
          : PushState.Unsupported;
      return;
    }

    if (!isConfigured()) {
      pushState = PushState.NotConfigured;
      return;
    }

    pushState = isCachedSubscription(identifier) ? PushState.Subscribed : PushState.Idle;

    let isStale = false;

    subscribedCities()
      .then((cities) => {
        if (!isStale) {
          pushState = cities.includes(identifier) ? PushState.Subscribed : PushState.Idle;
        }
      })
      .catch(() => undefined);

    return () => {
      isStale = true;
    };
  });

  const messages: Record<PushState, string> = $derived({
    [PushState.Idle]: translator.t('notifyIdle', { city: cityName }),
    [PushState.Working]: translator.t('notifyWorking'),
    [PushState.Subscribed]: translator.t('notifySubscribed'),
    [PushState.Blocked]: translator.t('notifyBlocked'),
    [PushState.Failed]: translator.t('notifyFailed'),
    [PushState.Unsupported]: translator.t('notifyUnsupported'),
    [PushState.NeedsHomeScreen]: translator.t('notifyNeedsHomeScreen'),
    [PushState.NotConfigured]: translator.t('notifyNotConfigured')
  });

  const isInteractive = $derived(
    pushState === PushState.Idle || pushState === PushState.Subscribed || pushState === PushState.Failed
  );

  async function toggle(): Promise<void> {
    const wasSubscribed = pushState === PushState.Subscribed;
    pushState = PushState.Working;

    const next = wasSubscribed ? await unsubscribeFromCity(cityId) : await subscribeToCity(cityId);
    pushState = next;
    announce(next, wasSubscribed);
  }

  function announce(next: PushState, wasSubscribed: boolean): void {
    if (next === PushState.Subscribed) {
      toasts.show({
        tone: ToastTone.Success,
        title: translator.t('toastOnTitle'),
        message: translator.t('toastOnMessage', { city: cityName })
      });
      return;
    }

    if (wasSubscribed && next === PushState.Idle) {
      toasts.show({
        tone: ToastTone.Success,
        title: translator.t('toastOffTitle'),
        message: translator.t('toastOffMessage', { city: cityName })
      });
      return;
    }

    toasts.show({
      tone: ToastTone.Error,
      title: translator.t('toastFailedTitle'),
      message: messages[next],
      autoClose: null
    });
  }
</script>

{#snippet face()}
  {#if pushState === PushState.Blocked || pushState === PushState.Unsupported || pushState === PushState.NeedsHomeScreen}
    <BellOff size={16} strokeWidth={2} />
  {:else if pushState === PushState.Working}
    <span class="spinner"><LoaderCircle size={16} strokeWidth={2} /></span>
  {:else}
    <span class="icon bell"><Bell size={16} strokeWidth={2} /></span>
    <span class="icon ring"><BellRing size={16} strokeWidth={2.2} /></span>
  {/if}
{/snippet}

{#if pushState === PushState.NeedsHomeScreen}
  <a
    class="notify"
    href={href('/obavestenja')}
    aria-label={messages[pushState]}
    use:tooltip={{ label: messages[pushState], placement: 'bottom' }}
  >
    {@render face()}
  </a>
{:else}
  <button
    type="button"
    class="notify"
    bind:this={element}
    data-notify-city={cityId}
    class:on={pushState === PushState.Subscribed}
    aria-label={messages[pushState]}
    aria-pressed={pushState === PushState.Subscribed}
    disabled={!isInteractive}
    use:tooltip={{ label: messages[pushState], placement: 'bottom' }}
    onclick={toggle}
  >
    {@render face()}
  </button>
{/if}

<style>
  .notify {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 38px;
    height: 38px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-faint);
    transition: color var(--transition), border-color var(--transition);
  }

  .notify:hover:not(:disabled) {
    color: var(--ink);
    border-color: var(--border-strong);
  }

  .notify:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .notify.on,
  .notify.on:hover:not(:disabled),
  .notify:global([data-subscribed]),
  .notify:global([data-subscribed]):hover:not(:disabled) {
    color: var(--ok);
  }

  .icon {
    display: none;
  }

  .bell,
  .notify.on .ring,
  .notify:global([data-subscribed]) .ring {
    display: inline-flex;
  }

  .notify.on .bell,
  .notify:global([data-subscribed]) .bell {
    display: none;
  }

  .spinner {
    display: inline-flex;
    animation: spin 900ms linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (pointer: coarse) {
    .notify {
      width: 44px;
      height: 44px;
    }
  }

  /* As with the header controls: no pointer means the hover pushState below is unreachable,
     so it becomes the resting one. The subscribed rule above is the more specific of the
     two and keeps its green. */
  @media (hover: none) {
    .notify {
      color: var(--ink);
      border-color: var(--border-strong);
    }
  }
</style>
