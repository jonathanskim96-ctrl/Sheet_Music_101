import styles from './UnitHeader.module.css';

export interface UnitHeaderProps {
  n: number;
  title: string;
  subtitle: string;
  /** Token name of the unit colour, e.g. '--unit-2'. */
  color: string;
}

/** Coloured banner that starts each unit on the path. */
export function UnitHeader({ n, title, subtitle, color }: UnitHeaderProps) {
  return (
    <header className={styles['header']} style={{ background: `var(${color})` }}>
      <p className={styles['kicker']}>Unit {n}</p>
      <h2 className={styles['title']}>{title}</h2>
      <p className={styles['subtitle']}>{subtitle}</p>
    </header>
  );
}
