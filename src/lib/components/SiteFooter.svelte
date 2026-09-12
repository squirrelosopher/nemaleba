<script lang="ts">
  import { page } from '$app/state';
  import UpdatedStamp from './UpdatedStamp.svelte';
  import type { Registry } from '$lib/domain/city';
  import { coversCity, type Provider } from '$lib/domain/provider';
  import { Utility } from '$lib/domain/utility';
  import { waterUtilityFor, type WaterUtility } from '$lib/domain/waterUtilities';
  import { translator } from '$lib/i18n/translator.svelte';

  let { generatedAt }: { generatedAt: string } = $props();

  // A page that names no city -- the homepage, the notification list -- speaks for the
  // whole country, and Belgrade is the place a reader of it is most likely to be in.
  const DEFAULT_CITY = 'beograd';

  interface Contact {
    id: string;
    name: string;
    phone: string;
  }

  const year = $derived(new Date(generatedAt).getFullYear());
  const registry = $derived(page.data.registry as Registry | undefined);
  const cityId = $derived(page.params.city ?? DEFAULT_CITY);

  const covering = $derived(
    (registry?.providers ?? []).filter((provider) => coversCity(provider, cityId))
  );

  const electricity = $derived(
    covering.find((provider) => provider.utility === Utility.Electricity)
  );
  const waterSource = $derived(covering.find((provider) => provider.utility === Utility.Water));

  // Where this page's rows were read from, so only ever a source actually scraped. A city
  // no water source covers therefore names electricity alone rather than a page that
  // never mentions it.
  const sources = $derived(
    [electricity, waterSource].filter((provider) => provider !== undefined)
  );

  // Who to call, which is a wider list: nearly every municipality has a water company
  // long before it has a feed worth reading, and its number is the more useful of the two.
  const water = $derived(waterSource ? undefined : waterUtilityFor(cityId));

  const contacts = $derived(
    [
      electricity ? fromProvider(electricity) : undefined,
      waterSource ? fromProvider(waterSource) : water ? fromUtility(water) : undefined
    ].filter((contact) => contact !== undefined)
  );

  function fromProvider(provider: Provider): Contact {
    return {
      id: provider.id,
      name: translator.providerName(provider),
      phone: provider.phone
    };
  }

  function fromUtility(utility: WaterUtility): Contact {
    return {
      id: cityId,
      name: translator.place(utility.nameCyrillic),
      phone: utility.phone
    };
  }

  function dial(phone: string): string {
    return `tel:${phone.replace(/\s/g, '')}`;
  }
</script>

<footer>
  <div class="shell inner">
    <p class="note">
      <span class="lead">{translator.t('footerNote')}</span>
      {#each sources as provider (provider.id)}
        <a
          class="source"
          href={provider.url}
          target="_blank"
          rel="noreferrer">{translator.providerName(provider)}</a>
      {/each}
    </p>

    {#if contacts.length > 0}
      <p class="contact">
        <span class="lead">{translator.t('footerReport')}</span>
        {#each contacts as contact (contact.id)}
          <span class="entry">{contact.name}
            <a class="phone numeric" href={dial(contact.phone)}>{contact.phone}</a></span>
        {/each}
      </p>
    {/if}

    <div class="meta">
      <UpdatedStamp generatedAt={generatedAt} />
      <p class="copyright numeric">© {year} nemaleba.rs</p>
    </div>
  </div>
</footer>

<style>
  footer {
    border-top: 1px solid var(--border);
    padding: 26px 0 40px;
  }

  /* Ordinary text flow rather than a flex row. As flex items the introducing sentence
     took a line to itself the moment it wrapped, pushing the sources below it; inline,
     the whole thing reads as one sentence and breaks wherever the width runs out. */
  .note,
  .contact {
    font-size: 12px;
    line-height: 1.7;
    color: var(--ink-muted);
    text-wrap: pretty;
  }

  .note {
    margin: 0;
  }

  .source + .source::before,
  .entry + .entry::before {
    content: '·';
    display: inline-block;
    margin: 0 5px;
    color: var(--ink-muted);
    opacity: 0.6;
  }

  .note .source {
    font-weight: 500;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: var(--border-strong);
  }

  .note .source:hover {
    text-decoration-color: var(--ink);
  }

  .contact {
    margin: 6px 0 0;
  }

  .entry {
    white-space: nowrap;
  }

  .phone {
    font-weight: 600;
    color: var(--ink);
  }

  .phone:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  @media (max-width: 560px) {
    .contact .lead {
      display: none;
    }

    .contact .entry {
      display: block;
    }

    .contact .entry + .entry::before {
      content: none;
    }
  }

  .meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
  }

  .copyright {
    margin: 0;
    font-size: 11px;
    color: var(--ink-faint);
  }

</style>
