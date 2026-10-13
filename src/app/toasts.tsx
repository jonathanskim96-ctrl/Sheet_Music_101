import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './toasts.module.css';

export type ToastKind = 'info' | 'error';
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

type ShowToast = (message: string, kind?: ToastKind) => void;
const ToastContext = createContext<ShowToast | null>(null);

const DISMISS_MS = 4000;

/** Small message at the top of the screen that goes away by itself after 4 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback<ShowToast>((message, kind = 'info') => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-2), { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((all) => all.filter((t) => t.id !== id));
    }, DISMISS_MS);
  }, []);

  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles['viewport']} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles['toast'] ?? ''} ${t.kind === 'error' ? (styles['error'] ?? '') : ''}`}
            data-testid="toast"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** `showToast(message, kind?)` */
export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast needs a ToastProvider');
  return ctx;
}
