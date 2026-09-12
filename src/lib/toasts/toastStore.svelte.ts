export const ToastTone = {
  Success: 'success',
  /** Something the reader should know, but nothing went wrong. */
  Notice: 'notice',
  /** A rule met, not a fault: the reader has to come back in a moment. */
  Waiting: 'waiting',
  /** The input itself is not allowed, however often it is offered. */
  Forbidden: 'forbidden',
  Error: 'error'
} as const;

export type ToastTone = (typeof ToastTone)[keyof typeof ToastTone];

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  autoClose: number | null;
}

export type ToastRequest = Omit<Toast, 'id' | 'autoClose'> & { autoClose?: number | null };

const DEFAULT_AUTO_CLOSE_MS = 5000;
const MAX_VISIBLE = 4;

class ToastStore {
  items = $state<Toast[]>([]);

  private nextId = 0;

  show(request: ToastRequest): void {
    const toast: Toast = {
      id: this.nextId,
      autoClose: request.autoClose === undefined ? DEFAULT_AUTO_CLOSE_MS : request.autoClose,
      tone: request.tone,
      title: request.title,
      message: request.message
    };

    this.nextId += 1;
    this.items = [...this.items, toast].slice(-MAX_VISIBLE);

    if (toast.autoClose !== null) {
      setTimeout(() => this.dismiss(toast.id), toast.autoClose);
    }
  }

  dismiss(id: number): void {
    this.items = this.items.filter((toast) => toast.id !== id);
  }
}

export const toasts = new ToastStore();
