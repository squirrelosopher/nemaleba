<script lang="ts">
  import { CircleCheck } from '@lucide/svelte';
  let {
    title,
    detail,
    wraps = false
  }: { title: string; detail: string; wraps?: boolean } = $props();
</script>

<div class="empty">
  <CircleCheck size={22} strokeWidth={1.8} />
  <p class="title">{title}</p>
  <p class="detail" class:wraps>{detail}</p>
</div>

<style>
  .empty {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 32px 16px;
    text-align: center;
    color: var(--ok);
  }

  .title {
    margin: 8px 0 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: var(--ink);
  }

  .detail {
    margin: 0;
    max-width: 100%;
    font-size: clamp(11px, 3.1vw, 13px);
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .wraps {
    white-space: normal;
    overflow: visible;
    text-wrap: pretty;
  }
</style>
