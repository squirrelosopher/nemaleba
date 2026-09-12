<script lang="ts">
  let {
    label,
    detail,
    checked,
    disabled = false,
    onToggle
  }: {
    label: string;
    detail?: string;
    checked: boolean;
    disabled?: boolean;
    onToggle: () => void;
  } = $props();
</script>

<button
  type="button"
  class="switch"
  role="switch"
  aria-checked={checked}
  {disabled}
  onclick={onToggle}
>
  <span class="text">
    <span class="label">{label}</span>
    {#if detail}
      <span class="detail">{detail}</span>
    {/if}
  </span>
  <span class="track" class:on={checked}>
    <span class="knob"></span>
  </span>
</button>

<style>
  .switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    min-height: 52px;
    padding: 10px 16px;
    text-align: left;
  }

  .switch:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
  }

  .detail {
    font-size: 12px;
    line-height: 1.4;
    color: var(--ink-faint);
    text-wrap: pretty;
  }

  .track {
    position: relative;
    flex: none;
    width: 42px;
    height: 24px;
    border-radius: 999px;
    background: var(--surface-sunken);
    border: 1px solid var(--border-strong);
    transition: background var(--transition), border-color var(--transition);
  }

  .track.on {
    background: var(--ok);
    border-color: var(--ok);
  }

  .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: var(--ink-faint);
    transition: transform var(--transition), background var(--transition);
  }

  .track.on .knob {
    background: #fff;
    transform: translateX(18px);
  }

  @media (hover: hover) {
    .switch:hover:not(:disabled) .label {
      color: var(--ink);
    }
  }
</style>
