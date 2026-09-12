// The count in the tab, the way a chat or a mail tab carries one. Every page sets its
// own title, and svelte rewrites it on navigation, so the badge is put back whenever
// that happens rather than being written once.

const BADGE = /^\(\d+\+?\)\s+/;
const SHOWN_AT_MOST = 9;

function badged(title: string, count: number): string {
  const bare = title.replace(BADGE, '');

  if (count < 1) {
    return bare;
  }

  return `(${count > SHOWN_AT_MOST ? `${SHOWN_AT_MOST}+` : count}) ${bare}`;
}

// Also the icon badge, where the reader installed the site as an app: the same count
// belongs on the launcher, and browsers that have no such thing simply lack the method.
function markApp(count: number): void {
  try {
    if (count > 0) {
      navigator.setAppBadge?.(count);
    } else {
      navigator.clearAppBadge?.();
    }
  } catch {
    return;
  }
}

export function badgeTab(count: number): (() => void) | undefined {
  if (typeof document === 'undefined') {
    return;
  }

  markApp(count);

  const apply = () => {
    const wanted = badged(document.title, count);

    if (document.title !== wanted) {
      document.title = wanted;
    }
  };

  apply();

  const title = document.querySelector('title');

  if (!title) {
    return;
  }

  // Writing the title trips the observer, and the guard above stops it there.
  const observer = new MutationObserver(apply);
  observer.observe(title, { childList: true, characterData: true, subtree: true });

  return () => observer.disconnect();
}
