import { useEffect, useId, useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { isTopModal, pushModal, type ModalEntry } from './modalStack';
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

/** Modal bottom sheet: traps focus, hides the page behind it, and returns focus on close. */
export function Sheet({ open, title, children, dismissible = true, onClose }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const entry = useMemo<ModalEntry>(() => ({ panel: () => panelRef.current }), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Shared stack: #root stays inert until the last sheet closes, lower sheets while covered.
    const release = pushModal(entry);
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    return () => {
      release();
      previous?.focus();
    };
  }, [open, entry]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isTopModal(entry)) onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, dismissible, entry]);

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
