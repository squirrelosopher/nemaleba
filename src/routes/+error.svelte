<script lang="ts">
  import { page } from '$app/state';
  import ErrorNotice from '$lib/components/ErrorNotice.svelte';
  import { translator } from '$lib/i18n/translator.svelte';

  const NOT_FOUND = 404;

  const missing = $derived(page.status === NOT_FOUND);

  const heading = $derived(translator.t(missing ? 'errorNotFoundTitle' : 'errorGenericTitle'));

  const detail = $derived(translator.t(missing ? 'errorNotFoundDetail' : 'errorGenericDetail'));
</script>

<svelte:head>
  <title>{heading} — nemaleba.rs</title>
</svelte:head>

<ErrorNotice title={heading} detail={detail} finder={missing ? 'search' : 'none'} />
