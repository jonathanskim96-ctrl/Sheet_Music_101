import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Sheet.module.css';

export interface SheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Escape and a tap on the backdrop close the sheet only when this is true (default). */
  dismissible?: boolean;
  onClose?: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open sheets, bottom to top. Only the top one is interactive and answers Escape; the page behind
// (#root) stays inert until the last one closes.
const openSheets: HTMLElement[] = [];

function syncInert(): void {
  const root = document.getElementById('root');
  if (root) root.inert = openSheets.length > 0;
  openSheets.forEach((el, i) => {
    el.inert = i < openSheets.length - 1;
  });
}

/** Modal bottom sheet: traps focus, hides the page behind it, and returns focus on close. */
export function Sheet({ open, title, children, dismissible = true, onClose }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backdrop = backdropRef.current;
    if (backdrop) openSheets.push(backdrop);
    syncInert();
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    return () => {
      const i = backdrop ? openSheets.indexOf(backdrop) : -1;
      if (i >= 0) openSheets.splice(i, 1);
      syncInert();
      previous?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      const top = openSheets[openSheets.length - 1];
      if (e.key === 'Escape' && top !== undefined && top === backdropRef.current) {
        onCloseRef.current?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, dismissible]);

  if (!open) return null;

  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      e.preventDefault();
      return;
    }
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === panelRef.current)
    ) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      className={styles['backdrop']}
      data-testid="sheet-backdrop"
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={styles['sheet']}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
      >
        <h2 id={titleId} className={styles['title']}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
