import type { ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'choice';

export interface ButtonProps {
  variant?: ButtonVariant;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Needed when the button shows only an icon. */
  ariaLabel?: string;
  type?: 'button' | 'submit';
}

/** The app's one button: chunky "3D" edge, 52 px tall, visible focus ring. */
export function Button({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  fullWidth = false,
  ariaLabel,
  type = 'button',
}: ButtonProps) {
  const className = [styles['button'], styles[variant], fullWidth ? styles['full'] : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
