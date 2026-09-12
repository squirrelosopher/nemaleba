<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, CloudOff, Send } from '@lucide/svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { href } from '$lib/i18n/routing';
  import { backLink } from '$lib/navigation/backLink';
  import type { MessageKey } from '$lib/i18n/messages';
  import { translator } from '$lib/i18n/translator.svelte';
  import {
    COMMENT_MAX_LENGTH,
    loadComments,
    postComment,
    PostResult,
    type Comment
  } from '$lib/comments/commentClient';
  import { ToastTone, toasts } from '$lib/toasts/toastStore.svelte';

  let { data } = $props();

  const city = $derived(data.city);
  const cityName = $derived(translator.place(city.nameCyrillic));

  // Usually the city above, but a reader who came here from somewhere else goes there.
  const back = $derived(
    backLink(data.registry.cities, `/${city.id}/komentari`) ?? null
  );

  const PENDING = new Promise<Comment[]>(() => {});

  let draft = $state('');
  let listing = $state<Promise<Comment[]>>(PENDING);
  let sending = $state(false);

  const remaining = $derived(COMMENT_MAX_LENGTH - draft.length);
  const empty = $derived(draft.trim().length === 0);

  onMount(() => {
    listing = loadComments(city.id);
  });

  type Failure = Exclude<PostResult, typeof PostResult.Posted>;

  const FAILURES: Record<Failure, { tone: ToastTone; title: MessageKey; detail: MessageKey }> = {
    [PostResult.RateLimited]: {
      tone: ToastTone.Waiting,
      title: 'commentTooManyTitle',
      detail: 'commentTooManyDetail'
    },
    [PostResult.LinksRejected]: {
      tone: ToastTone.Forbidden,
      title: 'commentNoLinksTitle',
      detail: 'commentNoLinksDetail'
    },
    [PostResult.Failed]: {
      tone: ToastTone.Error,
      title: 'commentFailedTitle',
      detail: 'commentFailedDetail'
    }
  };

  async function submit(): Promise<void> {
    if (empty || sending) {
      return;
    }

    sending = true;
    const result = await postComment(city.id, draft.trim());
    sending = false;

    if (result !== PostResult.Posted) {
      const failure = FAILURES[result];

      toasts.show({
        tone: failure.tone,
        title: translator.t(failure.title),
        message: translator.t(failure.detail)
      });
      return;
    }

    draft = '';
    listing = loadComments(city.id);
  }

  function postedAt(comment: Comment): string {
    return new Date(comment.created_at * 1000).toLocaleString(translator.htmlLang, {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>{translator.t('metaCommentsTitle', { city: city.nameLatin })}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="shell page">
  <a class="back" href={href(back.path)}>
    <ArrowLeft size={14} strokeWidth={2.2} />
    {back.label}
  </a>

  <header class="title">
    <h1>{translator.t('comments')}</h1>
    <p class="place">{cityName}</p>
  </header>

  <section class="panel">
    {#await listing}
      <span class="pending" aria-hidden="true"></span>
    {:then comments}
      {#if comments.length === 0}
        <EmptyState
          title={translator.t('commentsEmptyTitle')}
          detail={translator.t('commentsEmptyDetail')}
          wraps
        />
      {:else}
        {#each comments as comment (comment.id)}
          <article class="comment">
            <p class="body">{comment.body}</p>
            <p class="stamp numeric">{postedAt(comment)}</p>
          </article>
        {/each}
      {/if}
    {:catch}
      <div class="trouble">
        <CloudOff size={22} strokeWidth={1.8} />
        <p class="trouble-title">{translator.t('commentsUnavailableTitle')}</p>
        <p class="trouble-detail">{translator.t('commentsUnavailableDetail')}</p>
      </div>
    {/await}
  </section>

  <div class="compose">
    <p class="eyebrow">{translator.t('commentNew')}</p>

    <form
      class="composer"
      onsubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        rows="4"
        maxlength={COMMENT_MAX_LENGTH}
        bind:value={draft}
        aria-label={translator.t('commentNew')}
        placeholder={translator.t('commentPlaceholder')}
      ></textarea>

      <div class="foot">
        <span class="counter numeric" aria-live="polite">
          {translator.t('commentRemaining', { count: remaining })}
        </span>

        <button type="submit" class="send" disabled={empty || sending}>
          <Send size={14} strokeWidth={2.2} />
          {translator.t('commentSubmit')}
        </button>
      </div>
    </form>

    <p class="disclaimer">{translator.t('commentDisclaimer')}</p>
  </div>
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

  .place {
    margin: 5px 0 0;
    font-size: 12.5px;
    color: var(--ink-muted);
  }

  .panel {
    display: flex;
    flex-direction: column;
    max-height: var(--table-height);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    overflow-y: auto;
  }

  .pending {
    display: block;
    height: 170px;
  }

  .trouble {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 32px 16px;
    text-align: center;
    color: var(--alert);
  }

  .trouble-title {
    margin: 8px 0 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: var(--ink);
  }

  .trouble-detail {
    margin: 0;
    max-width: 34ch;
    font-size: clamp(11px, 3.1vw, 13px);
    color: var(--ink-muted);
    text-wrap: pretty;
  }

  .comment {
    padding: 14px 16px;
  }

  .comment + .comment {
    border-top: 1px solid var(--border);
  }

  .body {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .stamp {
    margin: 6px 0 0;
    font-size: 11.5px;
    color: var(--ink-faint);
  }

  .compose {
    margin-top: 26px;
  }

  .composer {
    margin-top: 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    transition: border-color var(--transition);
  }

  .composer:focus-within {
    border-color: var(--border-strong);
  }

  textarea {
    display: block;
    width: 100%;
    min-height: 96px;
    padding: 14px 16px 0;
    border: none;
    outline: none;
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: 16px;
    line-height: 1.5;
    resize: none;
  }

  textarea::placeholder {
    color: var(--ink-faint);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px 12px;
  }

  .counter {
    padding-left: 4px;
    font-size: 12px;
    color: var(--ink-faint);
  }

  .send {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--bg);
    font-size: 12.5px;
    font-weight: 600;
    transition: opacity var(--transition);
  }

  .disclaimer {
    margin: 10px 2px 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--ink-faint);
    text-wrap: pretty;
  }

  .send:disabled {
    opacity: 0.4;
    cursor: default;
  }

  @media (hover: hover) {
    .back:hover {
      color: var(--ink);
    }
  }

  @media (hover: none) {
    .back {
      color: var(--ink);
    }
  }
</style>
