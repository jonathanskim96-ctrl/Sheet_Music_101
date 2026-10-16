import { useState, type ReactNode } from 'react';
import {
  EVENT_SETS,
  MB,
  MELODIES,
  MF,
  MH,
  MK,
  MN,
  MS,
  MT,
  RHYTHM_PATTERNS,
  SB,
  SH,
  ST,
  type RhythmSet,
} from '../domain/library';
import type { HomeSign, Melody, Time } from '../domain/music';
import type { Clef } from '../domain/notes';
import { GLYPHS } from '../notation/glyphs';
import { K } from '../notation/geometry';
import { Keyboard, pressedNote } from '../notation/Keyboard';
import { Music } from '../notation/Music';
import { melodyScore, rhythmScore, type DrawEvent, type MusicScore } from '../notation/musicDraw';
import { Section } from './GalleryParts';
import styles from './GalleryScreen.module.css';

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div data-section={id} className={styles['stack']}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles['cell']}>
      <span className={styles['muted']}>{label}</span>
      {children}
    </div>
  );
}

function GlyphSample({ name }: { name: keyof typeof GLYPHS }) {
  const g = GLYPHS[name];
  const [x0, y0, x1, y1] = g.bounds;
  const pad = 40;
  const w = (x1 - x0 + 2 * pad) * K;
  const h = (y1 - y0 + 2 * pad) * K;
  return (
    <Labelled label={name}>
      <svg
        width={Math.max(w, 24)}
        height={Math.max(h, 24)}
        viewBox={`${String((x0 - pad) * K)} ${String(-(y1 + pad) * K)} ${String(w)} ${String(h)}`}
        role="img"
        aria-label={name}
        data-testid="gallery-glyph"
      >
        <path fill="currentColor" d={g.d} transform={`scale(${String(K)} ${String(-K)})`} />
      </svg>
    </Labelled>
  );
}

const SETS: RhythmSet[] = ['RA', 'RD', 'RR', 'RE'];

/** A one-box melody that holds only a whole rest, to show a header (clef, home sign, time). */
function headerScore(clef: Clef, home: HomeSign, time: Time): MusicScore {
  const events: DrawEvent[] =
    time === 4
      ? [{ kind: 'rest', dur: 'W' }]
      : time === 3
        ? [
            { kind: 'rest', dur: 'H' },
            { kind: 'rest', dur: 'Q' },
          ]
        : [{ kind: 'rest', dur: 'H' }];
  return { time, home, staffs: [{ clef, boxes: [events] }] };
}

function MelodyList({
  list,
  mode,
}: {
  list: readonly Melody[];
  mode: 'treble' | 'bass' | 'grand';
}) {
  return (
    <>
      {list.map((m) => (
        <Labelled
          key={m.id}
          label={`${m.id} (${m.home === 'none' ? 'no home sign' : `home sign ${m.home}`}, time ${String(m.time)})`}
        >
          <Music mode={mode} score={melodyScore(m)} />
        </Labelled>
      ))}
    </>
  );
}

const T1 = MT[0];

/** The same music with the last event of the last box replaced by a dashed empty slot. */
function withEmptySlot(score: MusicScore): MusicScore {
  return {
    ...score,
    staffs: score.staffs.map((st) => ({
      ...st,
      boxes: st.boxes.map((box, b) =>
        b === st.boxes.length - 1
          ? [...box.slice(0, -1), { kind: 'empty' as const, beats: 2 }]
          : box,
      ),
    })),
  };
}
const F1 = MF[0];

/** The "Part 2" gallery section (M9): every glyph, rhythm, tune, stack and the black keys. */
export function GalleryPart2() {
  const [lastBlack, setLastBlack] = useState('none');
  const marked = T1 ? melodyScore(T1, { staff: 0, box: 0, index: 2 }) : null;
  const slot = T1 ? withEmptySlot(melodyScore(T1)) : null;
  const markedSign = F1 ? melodyScore(F1, { staff: 0, box: 0, index: 1 }) : null;
  const markedHigh = MT.find((m) => m.id === 't6');
  return (
    <Section id="part-2" title="Part 2">
      <div className={styles['stack']}>
        <Block id="part-2-glyphs" title="Glyphs">
          <div className={styles['grid']}>
            {(Object.keys(GLYPHS) as (keyof typeof GLYPHS)[]).map((name) => (
              <GlyphSample key={name} name={name} />
            ))}
          </div>
        </Block>

        <Block id="part-2-headers" title="Home signs and time numbers">
          {(['G', 'F', 'D', 'Bb'] as const).flatMap((home) =>
            (['treble', 'bass'] as const).map((clef) => (
              <Labelled key={`${home}-${clef}`} label={`Home sign ${home}, ${clef}`}>
                <Music mode={clef} score={headerScore(clef, home, 4)} />
              </Labelled>
            )),
          )}
          {([2, 3, 4] as const).map((time) => (
            <Labelled key={time} label={`Time ${String(time)}`}>
              <Music mode="treble" score={headerScore('treble', 'none', time)} />
            </Labelled>
          ))}
          <Labelled label="Both clefs, home sign D, grand staff">
            <Music
              mode="grand"
              score={{
                time: 4,
                home: 'D',
                staffs: [
                  { clef: 'treble', boxes: [[{ kind: 'rest', dur: 'W' }]] },
                  { clef: 'bass', boxes: [[{ kind: 'rest', dur: 'W' }]] },
                ],
              }}
            />
          </Labelled>
        </Block>

        {SETS.map((set) => (
          <Block
            key={set}
            id={`part-2-rhythm-${set.toLowerCase()}`}
            title={`Rhythm patterns ${set}`}
          >
            {RHYTHM_PATTERNS.filter((p) => p.set === set).map((p) => (
              <Labelled key={p.id} label={`${p.id}: ${p.text}`}>
                <Music mode="rhythm" score={rhythmScore(p.tokens, p.time)} />
              </Labelled>
            ))}
            <div className={styles['stack']}>
              {EVENT_SETS[set].map((t) => (
                <Labelled key={t} label={`single ${t}`}>
                  <Music mode="rhythm" score={rhythmScore([t], 4)} showTime={false} />
                </Labelled>
              ))}
            </div>
          </Block>
        ))}

        <Block id="part-2-melodies-treble" title="Treble tunes (MT)">
          <MelodyList list={MT} mode="treble" />
        </Block>
        <Block id="part-2-melodies-signs" title="Signs last the box (MS) and start fresh (MF)">
          <MelodyList list={[...MS, ...MF]} mode="treble" />
        </Block>
        <Block id="part-2-melodies-bass" title="Bass tunes (MB)">
          <MelodyList list={MB} mode="bass" />
        </Block>
        <Block id="part-2-melodies-home" title="Home signs (MK)">
          <MelodyList list={MK.filter((m) => m.staffs[0].clef === 'treble')} mode="treble" />
          <MelodyList list={MK.filter((m) => m.staffs[0].clef === 'bass')} mode="bass" />
        </Block>
        <Block id="part-2-melodies-natural" title="Natural beats the home sign (MN)">
          <MelodyList list={MN} mode="treble" />
        </Block>
        <Block id="part-2-melodies-grand" title="Both hands (MH)">
          <MelodyList list={MH} mode="grand" />
        </Block>

        <Block id="part-2-stacks" title="Note stacks">
          <div className={styles['stack']}>
            {ST.map((m) => (
              <Labelled key={m.id} label={m.id}>
                <Music mode="treble" score={melodyScore(m)} showTime={false} />
              </Labelled>
            ))}
            {SB.map((m) => (
              <Labelled key={m.id} label={m.id}>
                <Music mode="bass" score={melodyScore(m)} showTime={false} />
              </Labelled>
            ))}
            {SH.map((m) => (
              <Labelled key={m.id} label={m.id}>
                <Music mode="grand" score={melodyScore(m)} showTime={false} />
              </Labelled>
            ))}
          </div>
          <p className={styles['muted']}>C, F and G stacks (SCFG) are st-C4, st-F4 and st-G4.</p>
        </Block>

        <Block id="part-2-marks" title="Marked note, empty slot, states">
          {marked && (
            <Labelled label="Marked note (third note)">
              <Music mode="treble" score={marked} />
            </Labelled>
          )}
          {markedSign && (
            <Labelled label="Marked note with a sign">
              <Music mode="treble" score={markedSign} />
            </Labelled>
          )}
          {markedHigh && (
            <Labelled label="Marked high note">
              <Music
                mode="treble"
                score={melodyScore(markedHigh, { staff: 0, box: 1, index: 0 })}
              />
            </Labelled>
          )}
          {MH[0] && (
            <Labelled label="Marked note in the grand staff">
              <Music mode="grand" score={melodyScore(MH[0], { staff: 1, box: 0, index: 0 })} />
            </Labelled>
          )}
          <Labelled label="Marked note on the rhythm line">
            <Music
              mode="rhythm"
              score={{
                time: 4,
                home: 'none',
                staffs: [
                  {
                    clef: 'treble',
                    boxes: [
                      [
                        { kind: 'note', dur: 'q', notes: [{ note: null, printed: null }] },
                        {
                          kind: 'note',
                          dur: 'q',
                          notes: [{ note: null, printed: null, marked: true }],
                        },
                        { kind: 'note', dur: 'h', notes: [{ note: null, printed: null }] },
                      ],
                    ],
                  },
                ],
              }}
            />
          </Labelled>
          {slot && (
            <Labelled label="Empty slot (finish the box)">
              <Music mode="treble" score={slot} />
            </Labelled>
          )}
          {(['correct', 'wrong', 'ghost'] as const).map((state) => (
            <Labelled key={state} label={`State ${state}`}>
              <Music
                mode="treble"
                score={T1 ? melodyScore(T1, undefined, state) : headerScore('treble', 'none', 4)}
              />
            </Labelled>
          ))}
        </Block>

        <Block id="part-2-keyboard" title="Keyboard with black keys">
          <Keyboard
            from="C3"
            to="B4"
            ariaLabel="Keyboard with black keys labelled"
            blackLabels
            blackStates={{ F3: 'highlight', C4: 'wrong' }}
            onPress={(k) => {
              setLastBlack('black' in k ? String(k.black) : pressedNote(k));
            }}
          />
          <p className={styles['muted']} data-testid="last-black">
            Last black key: {lastBlack}
          </p>
          <Keyboard from="C4" to="B4" blackLabels ariaLabel="One octave with black keys labelled" />
        </Block>

        <p className={styles['muted']} data-testid="part-2-count">
          {String(MELODIES.length)} tunes, {String(RHYTHM_PATTERNS.length)} rhythm patterns.
        </p>
      </div>
    </Section>
  );
}
