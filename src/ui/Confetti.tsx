import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';
import styles from './Confetti.module.css';

const COUNT = 80;
const LIFETIME_MS = 2500;

interface Piece {
  id: number;
  left: number;
  delay: number;
  rotation: number;
  colour: number;
}

function makePieces(): Piece[] {
  return Array.from({ length: COUNT }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 300,
    rotation: Math.random() * 360,
    colour: 1 + Math.floor(Math.random() * 11),
  }));
}

/** 80 falling pieces; removes itself after 2.5 s. Renders nothing with reduced motion. */
export function Confetti({ onDone }: { onDone?: () => void }) {
  const reduced = useReducedMotion();
  const [pieces] = useState(makePieces);
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAlive(false);
      onDone?.();
    }, LIFETIME_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [onDone]);

  if (reduced || !alive) return null;
  return (
    <div className={styles['layer']} data-testid="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className={styles['piece']}
          style={{
            left: `${String(p.left)}%`,
            background: `var(--unit-${String(p.colour)})`,
            transform: `rotate(${String(p.rotation)}deg)`,
            animationDelay: `${String(p.delay)}ms`,
          }}
        />
      ))}
    </div>
  );
}
