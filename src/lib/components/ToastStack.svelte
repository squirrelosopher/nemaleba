<script lang="ts">
  import { Ban, Check, Hourglass, ShieldAlert, TriangleAlert, X } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { translator } from '$lib/i18n/translator.svelte';
  import { ToastTone, toasts } from '$lib/toasts/toastStore.svelte';

  const TRANSITION_MS = 250;
  const SLIDE_PIXELS = 24;
</script>

<div class="stack" role="status" aria-live="polite">
  {#each toasts.items as toast (toast.id)}
    <div
      class="toast {toast.tone}"
      transition:fly={{ x: SLIDE_PIXELS, duration: TRANSITION_MS }}
    >
      <span class="badge">
        {#if toast.tone === ToastTone.Success}
          <Check size={16} strokeWidth={2.6} />
        {:else if toast.tone === ToastTone.Notice}
          <ShieldAlert size={16} strokeWidth={2.3} />
        {:else if toast.tone === ToastTone.Waiting}
          <Hourglass size={16} strokeWidth={2.3} />
        {:else if toast.tone === ToastTone.Forbidden}
          <Ban size={16} strokeWidth={2.4} />
        {:else}
          <TriangleAlert size={16} strokeWidth={2.4} />
        {/if}
      </span>

      <div class="content">
        <p class="title">{toast.title}</p>
        {#if toast.message}
          <p class="message">{toast.message}</p>
        {/if}
      </div>

      <button
        type="button"
        class="close"
        aria-label={translator.t('toastClose')}
        onclick={() => toasts.dismiss(toast.id)}
      >
        <X size={15} strokeWidth={2.2} />
      </button>
    </div>
  {/each}
</div>

<style>
  .stack {
    position: fixed;
    top: 14px;
    right: 14px;
    z-index: 300;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 420px;
    max-width: calc(100vw - 28px);
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 14px 14px 16px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    box-shadow: 0 14px 32px -14px rgb(0 0 0 / 0.55);
    pointer-events: auto;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    color: #fff;
  }

  .success .badge {
    background: var(--ok);
  }

  .error .badge {
    background: var(--alert);
  }

  .notice .badge,
  .waiting .badge,
  .forbidden .badge {
    background: var(--warn);
  }

  .content {
    flex: 1;
    min-width: 0;
  }

  .title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .message {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    margin: 3px 0 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--ink-muted);
    overflow: hidden;
    text-wrap: pretty;
  }

  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 26px;
    height: 26px;
    margin: 0 -4px 0 0;
    border-radius: var(--radius-sm);
    color: var(--ink-faint);
    transition: color var(--transition), background var(--transition);
  }

  .close:hover {
    background: var(--surface-sunken);
    color: var(--ink);
  }

  @media (max-width: 560px) {
    .stack {
      top: 10px;
      right: 10px;
      left: 10px;
      width: auto;
      max-width: none;
    }
  }
</style>
