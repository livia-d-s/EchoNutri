/**
 * Tiny global toast bus so any module (components deep in the tree, or plain
 * utils like the PDF generator) can trigger the app's styled toast instead of
 * a native alert(). App.tsx registers the single renderer via registerToast();
 * everyone else just calls notify().
 */
export type ToastType = 'success' | 'error';
type Listener = (message: string, type: ToastType) => void;

let listener: Listener | null = null;

/** Called once by App.tsx to wire the toast renderer. Returns an unsubscribe. */
export function registerToast(l: Listener): () => void {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}

/** Show a styled toast from anywhere. Falls back to console if no renderer. */
export function notify(message: string, type: ToastType = 'success'): void {
  if (listener) listener(message, type);
  else console[type === 'error' ? 'error' : 'log'](message);
}
