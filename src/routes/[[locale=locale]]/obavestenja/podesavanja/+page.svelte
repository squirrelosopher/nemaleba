<script lang="ts">
  import { onMount } from 'svelte';
  import { href } from '$lib/i18n/routing';
  import { backLink } from '$lib/navigation/backLink';
  import { tooltip } from '$lib/actions/tooltip';
  import { ArrowLeft, X } from '@lucide/svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ToggleSwitch from '$lib/components/ToggleSwitch.svelte';
  import type { Registry } from '$lib/domain/city';
  import { translator } from '$lib/i18n/translator.svelte';
  import {
    loadPreferences,
    savePreferences,
    subscribedCities,
    unsubscribeFromCity
  } from '$lib/notifications/pushClient';
  import {
    allowsSubscribing,
    DeliverySetup,
    detectDeliverySetup
  } from '$lib/notifications/delivery';
  import {
    DEFAULT_PREFERENCES,
    type NotificationPreferences
  } from '$lib/notifications/preferences';

  let { data } = $props();

  const registry = $derived(data.registry as Registry);

  const back = $derived(backLink(registry.cities, '/obavestenja/podesavanja'));

  let preferences = $state<NotificationPreferences>(DEFAULT_PREFERENCES);
  let setup = $state<DeliverySetup | null>(null);
  let cities = $state<string[]>([]);
  let loaded = $state(false);
  let removing = $state<string | null>(null);

  const locked = $derived(setup !== null && !allowsSubscribing(setup));

  // With neither utility notified about, nothing arrives for grouping to shape, so the
  // control says so rather than remembering a choice that decides nothing.
  const nothingToGroup = $derived(!preferences.electricity && !preferences.water);

  onMount(async () => {
    setup = detectDeliverySetup();
    preferences = await loadPreferences();
    cities = await subscribedCities();
    loaded = true;
  });

  async function toggle(key: 'electricity' | 'water' | 'grouped'): Promise<void> {
    const next = { ...preferences, [key]: !preferences[key], locale: translator.current };

    preferences = next;
    await savePreferences(next);
  }

  function nameOf(cityId: string): string {
    const city = registry.cities.find((candidate) => candidate.id === cityId);
    return city ? translator.place(city.nameCyrillic) : cityId;
  }

  async function remove(cityId: string): Promise<void> {
    if (removing) {
      return;
    }

    removing = cityId;
    await unsubscribeFromCity(cityId);
    cities = cities.filter((entry) => entry !== cityId);
    removing = null;
  }
</script>

<svelte:head>
  <title>{translator.t('notificationPreferences')} | nemaleba.rs</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="shell page">
  <a class="back" href={href(back.path)}>
    <ArrowLeft size={14} strokeWidth={2.2} />
    {back.label}
  </a>

  <header class="title">
    <h1>{translator.t('notificationPreferences')}</h1>

    {#if locked}
      <p class="note">{translator.t('notifyNeedsHomeScreen')}</p>
    {/if}
  </header>

  <div class="switches">
    <ToggleSwitch
      label={translator.t('notifyForElectricity')}
      detail={translator.t('notifyForElectricityDetail')}
      checked={preferences.electricity}
      disabled={locked}
      onToggle={() => toggle('electricity')}
    />
    <ToggleSwitch
      label={translator.t('notifyForWater')}
      detail={translator.t('notifyForWaterDetail')}
      checked={preferences.water}
      disabled={locked}
      onToggle={() => toggle('water')}
    />
    <ToggleSwitch
      label={translator.t('notifyGrouped')}
      detail={translator.t('notifyGroupedDetail')}
      checked={preferences.grouped}
      disabled={locked || nothingToGroup}
      onToggle={() => toggle('grouped')}
    />
  </div>

  <p class="eyebrow">{translator.t('subscribedCities')}</p>

  <section class="panel">
    {#if loaded && cities.length === 0}
      <EmptyState
        title={translator.t('subscribedCitiesEmptyTitle')}
        detail={translator.t('subscribedCitiesEmptyDetail')}
        wraps
      />
    {:else}
      {#each cities as cityId (cityId)}
        <article class="entry">
          <a class="name" href={href(`/${cityId}`)}>{nameOf(cityId)}</a>

          <button
            type="button"
            aria-label={translator.t('removeCity', { city: nameOf(cityId) })}
            use:tooltip={{ label: translator.t('removeCity', { city: nameOf(cityId) }) }}
            disabled={removing === cityId}
            onclick={() => remove(cityId)}
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </article>
      {/each}
    {/if}
  </section>
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

  h1 {
    font-size: clamp(28px, 5vw, 38px);
  }

  .note {
    margin: 6px 0 0;
    font-size: 12.5px;
    color: var(--ink-muted);
    text-wrap: pretty;
  }

  .switches {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    overflow: hidden;
  }

  .eyebrow {
    margin: 26px 2px 10px;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .panel {
    display: flex;
    flex-direction: column;
    max-height: var(--table-height);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow-y: auto;
  }

  .entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 10px 6px 16px;
  }

  .entry + .entry {
    border-top: 1px solid var(--border);
  }

  .name {
    display: flex;
    align-items: center;
    flex: 1;
    min-height: 44px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
  }

  .entry button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .entry button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: var(--radius-sm);
    color: var(--ink-faint);
    transition: color var(--transition), background var(--transition);
  }

  @media (hover: hover) {
    .back:hover {
      color: var(--ink);
    }

    .entry button:hover {
      background: var(--surface-sunken);
      color: var(--alert);
    }
  }

  @media (hover: none) {
    .back,
    .entry button {
      color: var(--ink);
    }
  }

  @media (pointer: coarse) {
    .entry button {
      width: 42px;
      height: 42px;
    }
  }
</style>
