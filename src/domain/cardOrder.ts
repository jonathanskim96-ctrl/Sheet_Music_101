// Ordering a list of cards so no card sits next to itself (STANDARDS §3, SPEC 4.12).
import type { CardId } from './cards';
import { pickWeighted, shuffle } from './rng';

function hasAdjacentRepeat(a: readonly CardId[]): boolean {
  return a.some((x, i) => i > 0 && x === a[i - 1]);
}

function windowClean(a: readonly CardId[], i: number): boolean {
  return a[i] !== a[i - 1] && a[i] !== a[i + 1];
}

/**
 * Orders cards with no two equal neighbours (when that is possible). First the SPEC 4.12 way:
 * shuffle, then walk the list and swap each repeat with the first later slot that fixes it
 * without creating a new one. If a repeat survives, rebuild the whole order greedily, which
 * always succeeds when no card fills more than half the slots.
 */
export function orderWithoutRepeats(cards: readonly CardId[], rand: () => number): CardId[] {
  const order = shuffle(cards, rand);
  for (let i = 1; i < order.length; i++) {
    if (order[i] !== order[i - 1]) continue;
    for (let j = i + 1; j < order.length; j++) {
      const trial = [...order];
      const a = trial[i] as CardId;
      trial[i] = trial[j] as CardId;
      trial[j] = a;
      if (windowClean(trial, i) && windowClean(trial, j) && trial[i - 1] !== trial[i]) {
        order.splice(0, order.length, ...trial);
        break;
      }
    }
  }
  return hasAdjacentRepeat(order) ? greedyOrder(cards, rand) : order;
}

function greedyOrder(cards: readonly CardId[], rand: () => number): CardId[] {
  const counts = new Map<CardId, number>();
  for (const c of shuffle(cards, rand)) counts.set(c, (counts.get(c) ?? 0) + 1);
  const out: CardId[] = [];
  let prev: CardId | null = null;
  for (let remaining = cards.length; remaining > 0; remaining--) {
    const candidates: CardId[] = [];
    const left = remaining - 1;
    for (const [card, n] of counts) {
      if (n === 0 || card === prev) continue;
      // After placing `card`, nobody may need more than ceil(left/2) slots, and `card` itself
      // (now the previous item) no more than floor(left/2).
      const feasible = [...counts].every(([c, k]) => {
        const after = c === card ? k - 1 : k;
        return c === card ? after <= Math.floor(left / 2) : after <= Math.ceil(left / 2);
      });
      if (feasible) candidates.push(card);
    }
    if (candidates.length === 0) {
      // Not arrangeable: keep going with whatever is left (only possible with a dominant card).
      const left = [...counts].filter(([, n]) => n > 0).map(([card]) => card);
      const other = left.filter((card) => card !== prev);
      candidates.push(...(other.length > 0 ? other : left));
    }
    const pick = pickWeighted(
      candidates,
      candidates.map((c) => counts.get(c) ?? 0),
      rand,
    );
    counts.set(pick, (counts.get(pick) ?? 1) - 1);
    out.push(pick);
    prev = pick;
  }
  return out;
}
