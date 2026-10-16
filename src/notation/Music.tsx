import { useLayoutEffect, useRef, useState } from 'react';
import { staffPosition } from '../domain/notes';
import { GLYPHS, type Glyph } from './glyphs';
import { BRACE_SCALE, K, LEDGER_WIDTH, LINE_WIDTH, S, clefOriginY, yOf } from './geometry';
import {
  BAR_WIDTH,
  STEM_WIDTH,
  beamBetween,
  headWidth,
  layoutMusic,
  markerShape,
  noteShape,
  planRows,
  restShape,
  signGlyphName,
  timeDigitYs,
  xAt,
  EMPTY_SLOT,
  type MusicLayout,
  type MusicMode,
  type NoteShape,
} from './musicGeometry';
import {
  drawBeats,
  type DrawEvent,
  type DrawNote,
  type DrawState,
  type MusicScore,
} from './musicDraw';
import styles from './Music.module.css';

export interface MusicProps {
  mode: MusicMode;
  score: MusicScore;
  /** Show the time numbers (default true; a lone question may leave them out). */
  showTime?: boolean;
  /** Smallest staff space in CSS pixels before the boxes wrap onto a second row (default 9). */
  minSpace?: number;
  ariaLabel?: string;
}

type Name = keyof typeof GLYPHS;

function glyphTransform(x: number, y: number): string {
  return `translate(${String(x)} ${String(y)}) scale(${String(K)} ${String(-K)})`;
}

function Glyph({ name, x, y, className }: { name: Name; x: number; y: number; className: string }) {
  const g: Glyph = GLYPHS[name];
  return <path className={className} strokeWidth={0} d={g.d} transform={glyphTransform(x, y)} />;
}

function colourClass(state: DrawState | undefined, marked: boolean | undefined): string {
  if (state === 'correct') return styles['correct'] ?? '';
  if (state === 'wrong') return styles['wrong'] ?? '';
  const base = marked === true ? (styles['focus'] ?? '') : (styles['ink'] ?? '');
  return state === 'ghost' ? `${base} ${styles['ghost'] ?? ''}` : base;
}

function NoteParts({ shape, cls }: { shape: NoteShape; cls: string }) {
  const w = headWidth(shape.head);
  const headName: Name =
    shape.head === 'whole'
      ? 'noteheadWhole'
      : shape.head === 'half'
        ? 'noteheadHalf'
        : 'noteheadBlack';
  return (
    <>
      {shape.ledgers.map((l) => (
        <line
          key={l.y}
          className={styles['line']}
          x1={l.x1}
          x2={l.x2}
          y1={l.y}
          y2={l.y}
          strokeWidth={LEDGER_WIDTH}
        />
      ))}
      {shape.sign && (
        <Glyph
          name={signGlyphName(shape.sign.sign)}
          x={shape.sign.x}
          y={shape.sign.y}
          className={cls}
        />
      )}
      <Glyph name={headName} x={shape.x - w / 2} y={shape.y} className={cls} />
      {shape.stem && (
        <rect
          className={cls}
          strokeWidth={0}
          x={shape.stem.x - STEM_WIDTH / 2}
          y={Math.min(shape.stem.y1, shape.stem.y2)}
          width={STEM_WIDTH}
          height={Math.abs(shape.stem.y2 - shape.stem.y1)}
        />
      )}
      {shape.dot && (
        <Glyph
          name="augmentationDot"
          x={shape.dot.x - (GLYPHS.augmentationDot.advance * K) / 2}
          y={shape.dot.y}
          className={cls}
        />
      )}
    </>
  );
}

function Marker({
  mode,
  bottomLineY,
  shape,
}: {
  mode: MusicMode;
  bottomLineY: number;
  shape: NoteShape;
}) {
  const m = markerShape(mode, bottomLineY, shape.x, shape.y, shape.stem?.up ? shape.stem.y2 : null);
  return (
    <polygon
      className={styles['marker']}
      data-testid="music-marker"
      points={`${String(m.left.x)},${String(m.left.y)} ${String(m.right.x)},${String(m.right.y)} ${String(m.apex.x)},${String(m.apex.y)}`}
    />
  );
}

interface EventProps {
  layout: MusicLayout;
  staveIndex: number;
  clef: 'treble' | 'bass';
  box: number;
  beat: number;
  event: DrawEvent;
}

function EventShapes({ layout, staveIndex, clef, box, beat, event }: EventProps) {
  const mode = layout.mode;
  const stave = layout.staves[staveIndex];
  if (!stave) return null;
  const bottom = stave.bottomLineY;
  const x = xAt(layout, box, beat);
  if (event.kind === 'empty') {
    const mid = mode === 'rhythm' ? bottom : yOf(bottom, 4);
    return (
      <rect
        className={styles['slot']}
        data-testid="music-empty-slot"
        x={x - EMPTY_SLOT.width / 2}
        y={mid - EMPTY_SLOT.height / 2}
        width={EMPTY_SLOT.width}
        height={EMPTY_SLOT.height}
        rx={S * 0.5}
      />
    );
  }
  if (event.kind === 'rest') {
    const r = restShape(mode, bottom, x, event.dur);
    return <Glyph name={r.glyph} x={r.x} y={r.y} className={colourClass(event.state, false)} />;
  }
  const pitchOf = (n: DrawNote) =>
    mode === 'rhythm' || n.note === null ? 0 : staffPosition(clef, n.note);
  if (event.dur === 'ee') {
    const a = noteShape(mode, bottom, x, 0, 'ee', null);
    const b = noteShape(mode, bottom, xAt(layout, box, beat + 0.5), 0, 'ee', null);
    const beam = beamBetween(a, b);
    const first = event.notes[0];
    const cls = colourClass(first?.state, first?.marked);
    return (
      <g data-note-state={first?.state ?? 'normal'}>
        <NoteParts shape={a} cls={cls} />
        <NoteParts shape={b} cls={cls} />
        {beam && (
          <rect
            className={cls}
            strokeWidth={0}
            x={beam.x}
            y={beam.y}
            width={beam.width}
            height={beam.height}
          />
        )}
        {first?.marked === true && <Marker mode={mode} bottomLineY={bottom} shape={a} />}
      </g>
    );
  }
  return (
    <>
      {event.notes.map((n, i) => {
        const shape = noteShape(mode, bottom, x, pitchOf(n), event.dur, n.printed);
        return (
          <g
            key={`${String(i)}-${n.note ?? 'line'}`}
            data-note-state={n.state ?? 'normal'}
            data-note-position={pitchOf(n)}
            data-marked={n.marked === true ? 'true' : undefined}
          >
            <NoteParts shape={shape} cls={colourClass(n.state, n.marked)} />
            {n.marked === true && <Marker mode={mode} bottomLineY={bottom} shape={shape} />}
          </g>
        );
      })}
    </>
  );
}

interface RowProps {
  mode: MusicMode;
  score: MusicScore;
  firstBox: number;
  count: number;
  showTime: boolean;
  width: number;
}

function Row({ mode, score, firstBox, count, showTime, width }: RowProps) {
  const layout = layoutMusic({
    mode,
    home: score.home,
    time: showTime ? score.time : null,
    boxBeats: score.time,
    boxCount: count,
  });
  const { height, x0, clefX, staves } = layout;
  const digit = (n: 2 | 3 | 4) => (n === 2 ? 'timeSig2' : n === 3 ? 'timeSig3' : 'timeSig4');
  const lineYs = mode === 'rhythm' ? [0] : [0, 2, 4, 6, 8];
  const first = staves[0];
  const last = staves[staves.length - 1];
  return (
    <svg
      className={styles['svg']}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      aria-hidden="true"
      data-testid="music-row"
    >
      {staves.map((stave, si) => (
        <g key={stave.clef ?? 'line'}>
          {lineYs.map((p) => (
            <line
              key={p}
              className={styles['line']}
              x1={x0}
              x2={layout.boxEnd[count - 1] ?? width}
              y1={yOf(stave.bottomLineY, p)}
              y2={yOf(stave.bottomLineY, p)}
              strokeWidth={LINE_WIDTH}
            />
          ))}
          {stave.clef !== null && (
            <Glyph
              name={stave.clef === 'treble' ? 'gClef' : 'fClef'}
              x={clefX}
              y={clefOriginY({ clef: stave.clef, bottomLineY: stave.bottomLineY })}
              className={styles['ink'] ?? ''}
            />
          )}
          {layout.home
            .filter((h) => h.clef === stave.clef)
            .map((h) => (
              <Glyph
                key={`${h.letter}${h.sign}`}
                name={signGlyphName(h.sign)}
                x={h.x}
                y={yOf(stave.bottomLineY, h.p)}
                className={styles['ink'] ?? ''}
              />
            ))}
          {layout.timeX !== null &&
            (() => {
              const ys = timeDigitYs(mode, stave.bottomLineY);
              const g = (n: 2 | 3 | 4) => GLYPHS[digit(n)];
              const cx = (n: 2 | 3 | 4) =>
                (layout.timeX ?? 0) - ((g(n).bounds[0] + g(n).bounds[2]) / 2) * K;
              return (
                <>
                  <Glyph
                    name={digit(score.time)}
                    x={cx(score.time)}
                    y={ys.top}
                    className={styles['ink'] ?? ''}
                  />
                  <Glyph name="timeSig4" x={cx(4)} y={ys.bottom} className={styles['ink'] ?? ''} />
                </>
              );
            })()}
          {layout.boxEnd.map((bx, bi) => (
            <rect
              key={`bar-${String(bi)}`}
              className={styles['ink']}
              strokeWidth={0}
              x={bx - BAR_WIDTH / 2}
              y={mode === 'rhythm' ? stave.bottomLineY - 2 * S : yOf(stave.bottomLineY, 8)}
              width={BAR_WIDTH}
              height={mode === 'rhythm' ? 4 * S : 4 * S}
            />
          ))}
          {(score.staffs[si]?.boxes ?? []).slice(firstBox, firstBox + count).map((events, bi) => {
            let beat = 0;
            return events.map((ev, ei) => {
              const node = (
                <EventShapes
                  key={`${String(bi)}-${String(ei)}`}
                  layout={layout}
                  staveIndex={si}
                  clef={score.staffs[si]?.clef ?? 'treble'}
                  box={bi}
                  beat={beat}
                  event={ev}
                />
              );
              beat += drawBeats(ev);
              return node;
            });
          })}
        </g>
      ))}
      {mode === 'grand' && first && last && (
        <>
          <line
            className={styles['line']}
            x1={x0}
            x2={x0}
            y1={yOf(first.bottomLineY, 8)}
            y2={last.bottomLineY}
            strokeWidth={0.16 * S}
          />
          <path
            className={styles['ink']}
            strokeWidth={0}
            d={GLYPHS.brace.d}
            transform={`translate(0 ${String(last.bottomLineY)}) scale(${String(BRACE_SCALE)} ${String(-BRACE_SCALE)})`}
          />
        </>
      )}
    </svg>
  );
}

function defaultLabel(score: MusicScore, mode: MusicMode): string {
  const boxes = score.staffs[0]?.boxes.length ?? 0;
  const marked = score.staffs.some((st) =>
    st.boxes.some((b) =>
      b.some((e) => e.kind === 'note' && e.notes.some((n) => n.marked === true)),
    ),
  );
  const what = mode === 'rhythm' ? 'Rhythm' : 'Music';
  const boxText = boxes === 1 ? 'one box' : `${String(boxes)} boxes`;
  return `${what} with ${boxText}${marked ? ', one note marked' : ''}`;
}

/** Notes in boxes on a treble, bass or grand staff, or on the one-line rhythm staff (SPEC 8.4). */
export function Music({ mode, score, showTime = true, minSpace = 9, ariaLabel }: MusicProps) {
  const boxCount = score.staffs[0]?.boxes.length ?? 0;
  const holder = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = holder.current;
    if (!el) return;
    setPx(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      setPx(el.clientWidth);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  const input = {
    mode,
    home: score.home,
    time: showTime ? score.time : null,
    boxBeats: score.time,
    boxCount,
  };
  const rows = px === null || px <= 0 ? [boxCount] : planRows(input, px, minSpace);
  // Every row shares one viewBox width, so staff spaces are the same size on every row.
  const plan = rows.map((count, ri) => ({
    firstBox: rows.slice(0, ri).reduce((sum, n) => sum + n, 0),
    count,
    showTime: showTime && ri === 0,
  }));
  const width = Math.max(
    ...plan.map(
      (r) =>
        layoutMusic({
          ...input,
          time: r.showTime ? score.time : null,
          boxCount: r.count,
        }).width,
    ),
  );
  return (
    <div className={styles['paper']}>
      <div
        ref={holder}
        className={styles['rows']}
        role="img"
        aria-label={ariaLabel ?? defaultLabel(score, mode)}
        data-testid="music"
        data-rows={plan.length}
      >
        {plan.map((r) => (
          <Row key={r.firstBox} mode={mode} score={score} width={width} {...r} />
        ))}
      </div>
    </div>
  );
}
