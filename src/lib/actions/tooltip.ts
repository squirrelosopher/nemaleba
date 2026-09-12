import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement
} from '@floating-ui/dom';

export interface TooltipOptions {
  label: string;
  placement?: Placement;
  tappable?: boolean;
}

const ARROW_SIZE_PIXELS = 8;
const OFFSET_PIXELS = ARROW_SIZE_PIXELS + 2;
const VIEWPORT_PADDING = 10;
const TAP_VISIBLE_MS = 2600;

const OPPOSITE_SIDE: Record<string, string> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right'
};

function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function tooltip(node: HTMLElement, options: TooltipOptions) {
  let current = options;
  let bubble: HTMLDivElement | null = null;
  let pointer: HTMLDivElement | null = null;
  let stopAutoUpdate: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function position(): void {
    if (!bubble || !pointer) {
      return;
    }

    computePosition(node, bubble, {
      placement: current.placement ?? 'top',
      strategy: 'fixed',
      middleware: [
        offset(OFFSET_PIXELS),
        flip({ padding: VIEWPORT_PADDING }),
        shift({ padding: VIEWPORT_PADDING }),
        arrow({ element: pointer, padding: 6 })
      ]
    }).then(({ x, y, placement, middlewareData }) => {
      if (!bubble || !pointer) {
        return;
      }

      bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;

      const side = OPPOSITE_SIDE[placement.split('-')[0]];
      const offsets = middlewareData.arrow;

      pointer.style.cssText = '';
      pointer.style.left = offsets?.x == null ? '' : `${offsets.x}px`;
      pointer.style.top = offsets?.y == null ? '' : `${offsets.y}px`;
      pointer.style.setProperty(side, `${-ARROW_SIZE_PIXELS / 2}px`);
    });
  }

  function render(): void {
    bubble = document.createElement('div');
    bubble.className = 'nl-tooltip';
    bubble.setAttribute('role', 'tooltip');

    const text = document.createElement('span');
    text.textContent = current.label;

    pointer = document.createElement('div');
    pointer.className = 'nl-tooltip-arrow';

    bubble.append(text, pointer);
    document.body.appendChild(bubble);
    stopAutoUpdate = autoUpdate(node, bubble, position);

    requestAnimationFrame(() => bubble?.classList.add('visible'));
  }

  function show(): void {
    if (bubble || isTouchDevice() || !current.label) {
      return;
    }

    render();
  }

  function onOutside(event: PointerEvent): void {
    if (!node.contains(event.target as Node)) {
      hide();
    }
  }

  function onClick(): void {
    if (!current.tappable || !isTouchDevice() || !current.label) {
      return;
    }

    if (bubble) {
      hide();
      return;
    }

    render();
    document.addEventListener('pointerdown', onOutside, true);
    timer = setTimeout(hide, TAP_VISIBLE_MS);
  }

  function hide(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    document.removeEventListener('pointerdown', onOutside, true);
    stopAutoUpdate?.();
    stopAutoUpdate = null;
    bubble?.remove();
    bubble = null;
    pointer = null;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      hide();
    }
  }

  node.addEventListener('pointerenter', show);
  node.addEventListener('pointerleave', hide);
  node.addEventListener('focusin', show);
  node.addEventListener('focusout', hide);
  node.addEventListener('keydown', onKeydown);
  node.addEventListener('click', onClick);

  return {
    update(next: TooltipOptions) {
      current = next;

      if (bubble) {
        const [text] = bubble.childNodes;
        text.textContent = next.label;
        position();
      }
    },
    destroy() {
      hide();
      node.removeEventListener('pointerenter', show);
      node.removeEventListener('pointerleave', hide);
      node.removeEventListener('focusin', show);
      node.removeEventListener('focusout', hide);
      node.removeEventListener('keydown', onKeydown);
      node.removeEventListener('click', onClick);
    }
  };
}
