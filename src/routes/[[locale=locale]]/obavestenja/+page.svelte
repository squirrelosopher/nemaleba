<script lang="ts">
  import { onMount } from 'svelte';
  import { href } from '$lib/i18n/routing';
  import { backLink } from '$lib/navigation/backLink';
  import { ArrowLeft, BellOff, Download, Settings2, Trash2 } from '@lucide/svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import type { Registry } from '$lib/domain/city';
  import { tooltip } from '$lib/actions/tooltip';
  import { translator } from '$lib/i18n/translator.svelte';
  import { notificationLog, type NotificationEntry } from '$lib/notifications/notificationLog.svelte';
  import { unsubscribeFromCity } from '$lib/notifications/pushClient';
  import {
    canInstallFromBrowserMenu,
    DeliverySetup,
    detectDeliverySetup
  } from '$lib/notifications/delivery';
  import { installPrompt } from '$lib/notifications/installPrompt.svelte';
  import { ToastTone, toasts } from '$lib/toasts/toastStore.svelte';

  let { data } = $props();

  const registry = $derived(data.registry as Registry);

  const origin = $derived(backLink(registry.cities, '/obavestenja'));

  const entries = $derived(notificationLog.entries);

  let muting = $state<string | null>(null);
  let setup = $state<DeliverySetup | null>(null);
  let installableFromMenu = $state(false);

  onMount(() => {
    setup = detectDeliverySetup();
    installableFromMenu = canInstallFromBrowserMenu();

    return installPrompt.listen();
  });

  onMount(async () => {
    await notificationLog.load();
    await notificationLog.markAllRead();
  });

  function cityName(entry: NotificationEntry): string {
    const city = registry.cities.find((candidate) => candidate.id === entry.cityId);
    return city ? translator.place(city.nameCyrillic) : '';
  }

  function received(entry: NotificationEntry): string {
    return new Date(entry.receivedAt).toLocaleString(translator.htmlLang, {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function mute(entry: NotificationEntry): Promise<void> {
    if (!entry.cityId) {
      return;
    }

    muting = entry.cityId;
    await unsubscribeFromCity(entry.cityId);
    muting = null;

    toasts.show({
      tone: ToastTone.Success,
      title: translator.t('toastOffTitle'),
      message: translator.t('toastOffMessage', { city: cityName(entry) })
    });
  }
</script>

<svelte:head>
  <title>{translator.t('notificationsTitle')} | nemaleba.rs</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="shell page">
  <a class="back" href={href(origin.path)}>
    <ArrowLeft size={14} strokeWidth={2.2} />
    {origin.label}
  </a>

  <header class="title">
    <div class="heading">
      <h1>{translator.t('notificationsTitle')}</h1>

      <a
        class="settings"
        href={href('/obavestenja/podesavanja')}
        aria-label={translator.t('notificationPreferences')}
        use:tooltip={{ label: translator.t('notificationPreferences'), placement: 'bottom' }}
      >
        <Settings2 size={15} strokeWidth={2} />
      </a>
    </div>

    {#if setup === DeliverySetup.NeedsHomeScreen}
      <p class="note">{translator.t('installIos')}</p>
    {:else if setup === DeliverySetup.Installed}
      <p class="note">{translator.t('deliveryInstalled')}</p>
    {:else if setup !== null}
      <p class="note">
        {translator.t(
          setup === DeliverySetup.SurvivesBrowserClose ? 'deliveryOnHandheld' : 'deliveryOnDesktop'
        )}
      </p>

      {#if setup === DeliverySetup.RequiresOpenBrowser}
        <!-- Installing on a desktop does not make notifications survive a closed
             browser, so recommend a phone instead of an install nobody benefits from. -->
        <p class="note">{translator.t('deliveryTryPhone')}</p>
      {:else if installableFromMenu}
        {#if installPrompt.isOffered}
          <p class="note">{translator.t('installOnHandheld')}</p>
          <button type="button" class="get" onclick={() => installPrompt.request()}>
            <Download size={14} strokeWidth={2.2} />
            {translator.t('installApp')}
          </button>
        {:else}
          <p class="note">{translator.t('installFromMenuOnHandheld')}</p>
        {/if}
      {/if}
    {/if}

  </header>

  <section class="panel">
    {#if entries.length === 0}
      <EmptyState
        title={translator.t('notificationsEmptyTitle')}
        detail={translator.t('notificationsEmptyDetail')}
        wraps
      />
    {:else}
      {#each entries as entry (entry.id)}
        <article class="entry">
          <div class="body">
            <p class="heading">{entry.title}</p>
            <p class="detail">{translator.place(entry.body)}</p>
            <p class="stamp numeric">{received(entry)}</p>
            {#if entry.url}
              <a class="open" href={entry.url}>{cityName(entry) || translator.t('openSource')}</a>
            {/if}
          </div>

          <div class="actions">
            {#if entry.cityId}
              <button
                type="button"
                aria-label={translator.t('notificationMute', { city: cityName(entry) })}
                use:tooltip={{ label: translator.t('notificationMute', { city: cityName(entry) }) }}
                disabled={muting === entry.cityId}
                onclick={() => mute(entry)}
              >
                <BellOff size={15} strokeWidth={2} />
              </button>
            {/if}

            <button
              type="button"
              aria-label={translator.t('notificationDelete')}
              use:tooltip={{ label: translator.t('notificationDelete') }}
              onclick={() => notificationLog.remove(entry.id)}
            >
              <Trash2 size={15} strokeWidth={2} />
            </button>
          </div>
        </article>
      {/each}
    {/if}
  </section>

  {#if entries.length > 0}
    <button type="button" class="clear" onclick={() => notificationLog.clear()}>
      {translator.t('notificationsClearAll')}
    </button>
  {/if}
</div>

<style>
  .page {
    padding-top: 30px;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-faint);
    transition: color var(--transition);
  }

  .title {
    margin: 4px 0 18px;
  }

  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .settings {
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

  h1 {
    font-size: clamp(28px, 5vw, 38px);
  }

  .note {
    margin: 6px 0 0;
    font-size: 12.5px;
    color: var(--ink-muted);
    text-wrap: pretty;
  }

  .get {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 40px;
    margin-top: 6px;
    padding: 0 14px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--bg);
    font-size: 12.5px;
    font-weight: 600;
  }

  .panel {
    display: flex;
    flex-direction: column;
    max-height: calc(var(--table-height) + 140px);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow-y: auto;
  }

  .entry {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 16px;
    padding: 15px 16px;
  }

  .entry + .entry {
    border-top: 1px solid var(--border);
  }

  .body {
    min-width: 0;
  }

  .heading {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
  }

  .detail {
    margin: 3px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-muted);
    overflow-wrap: anywhere;
  }

  .stamp {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--ink-faint);
  }

  .open {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    margin-top: 2px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-faint);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 2px;
    align-self: start;
    margin: -5px -6px 0 0;
  }

  .actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--ink-faint);
    transition: color var(--transition), background var(--transition);
  }

  .actions button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .clear {
    display: flex;
    align-items: center;
    width: fit-content;
    min-height: 40px;
    margin-left: auto;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-faint);
    transition: color var(--transition);
  }

  @media (hover: hover) {
    .back:hover,
    .open:hover,
    .clear:hover {
      color: var(--ink);
    }

    .actions button:hover:not(:disabled) {
      background: var(--surface-sunken);
      color: var(--ink);
    }

    .settings:hover {
      color: var(--ink);
      border-color: var(--border-strong);
    }

    .clear:hover {
      color: var(--alert);
      border-color: var(--alert);
    }
  }

  @media (hover: none) {
    .back,
    .open,
    .settings,
    .actions button {
      color: var(--ink);
    }

    .settings {
      border-color: var(--border-strong);
    }
  }

  @media (pointer: coarse) {
    .actions button {
      width: 40px;
      height: 40px;
    }

    .settings {
      width: 42px;
      height: 42px;
    }
  }

  @media (max-width: 420px) {
    .settings {
      width: 36px;
      height: 36px;
    }
  }
</style>
