# Morning Carry Cap & Parent Confiscation — TODO / Plan

> Status: planned, not yet implemented.
> Goal: make stashing money in the piggy bank meaningful by introducing a morning "parent confiscation" step. The wallet has a daily carry cap; excess is taken before school. Bigger stash → bigger cap.

## Context

SugarWars currently lets the player hoard unlimited cash in the wallet between school days. The piggy-bank stash exists, but stashing has no urgency — wallet money is just as accessible (mostly), so most players ignore the stash mechanic.

To make stashing meaningful, we're adding a **morning carry cap**: each morning before school, parents confiscate any wallet money above a cap that scales with how much the player has stashed. More stash → bigger cap → more buying power tomorrow.

This is layered **on top of** the existing morning flow. Today's `addAllowance` in `src/hooks/useWallet.ts:64` (base $10 + jokers + hall passes + merchant + Finance Club + Deposit Bonus) stays intact. The cap is a morning-only gate; during the day, wallet can grow above the cap freely.

## Formula

```
savings     = max(0, stashedAmount + adoptionFee)         // money actually earned (0 at start)
floor       = max(20, adoptionFee × 0.02)                  // difficulty-scaled floor
basePct     = 0.10 + 0.05 × (depositBonusJokerLevel || 0)  // 10/15/20/25% per joker level
carryCap    = min( max(floor, savings × basePct), 100_000 )
confiscated = max(0, balance - carryCap)
```

### Output table (no Deposit Bonus joker)

| Difficulty | Adoption fee | Savings $0 | Savings 50% paid | Savings 100% paid |
|---|---|---|---|---|
| Lvl 1 | $5k | $100 | $250 | $500 |
| Lvl 5 | $100k | $2k | $5k | $10k |
| Lvl 10 | $1M | $20k | $50k | $100k (ceil) |
| Lvl 13 | $3.5M | $70k | $100k (ceil) | $100k |
| Lvl 16 | $10M | $100k (floor capped by ceil) | $100k | $100k |

**Trade-off acknowledged:** On Lvl 13–16 the difficulty floor meets/exceeds the $100k ceiling, so the cap is effectively constant at $100k on those levels — stash growth stops mattering for cap once the ceiling clamps. This is the cost of choosing a flat $100k ceiling. If we want stash to keep mattering at high difficulty, the ceiling has to scale.

## Morning sequence (in `handleSleepConfirm`)

Order matters. Insert the new step between interest/inheritance and allowance:

1. `applyDailyInterest(jokers)` — existing
2. `applyInheritance()` — existing
3. **NEW:** compute `carryCap`, capture `confiscated`, dispatch `applyMorningConfiscation(cap)`
4. `addAllowance(jokers, periodCount)` — existing; lands on top of capped wallet
5. Show `GoingToSchoolModal` with new `confiscated` and `cap` props

Allowance still runs after the cap, so it can technically push the wallet above the cap. That's intentional — the cap is "what you started with after parents went through your pockets," not a hard wallet ceiling.

## Files to change

- **`src/utils/morningCarryCap.ts`** *(NEW)* — pure function `computeCarryCap({ stashedAmount, adoptionFee, jokers })` returning `{ cap, floor, basePct, savings }` for UI breakdown. Reuses `getJokerEffectsAtLevel` from `src/utils/jokerEffectEngine.ts`.
- **`src/store/slices/walletSlice.ts`** — add `applyMorningConfiscation(cap: number)` reducer (mirror existing `setBalance` at line 31). Sets `state.balance = Math.min(state.balance, cap)`.
- **`app/(tabs)/after-school.tsx`** *(`handleSleepConfirm`, lines 201–228)* — call new util after `applyInheritance`, capture `confiscated = max(0, balance - cap)`, dispatch confiscation, pass `confiscated`/`cap` into `GoingToSchoolModal`.
- **`app/components/GoingToSchoolModal.tsx`** — render new "Parents took $X" line (red) when `confiscated > 0`, plus informational "Carry cap: $Y" line. Match existing allowance row styling (lines 95–100).
- **`src/hooks/useWallet.ts`** *(lines 159–170)* — remove the `stash_allowance_bonus` handler block (Deposit Bonus's old behavior).
- **`src/utils/jokerEffectEngine.ts`** — repurpose `JOKER_IDS.DEPOSIT_BONUS` factory: change effect `target` from `'stash_allowance_bonus'` to `'carry_cap_pct_bonus'`; values `0.05 / 0.10 / 0.15` per level.
- **`src/data/jokers.ts`** + **`docs-site/src/data/jokers.json`** — update Deposit Bonus joker description text.
- **`src/__tests__/utils/morningCarryCap.test.ts`** *(NEW)* — table tests across difficulties, savings levels, Deposit Bonus levels.
- **`src/__tests__/integration/`** — new integration test for morning ordering (interest → inheritance → confiscation → allowance).
- Update any existing joker tests asserting `'stash_allowance_bonus'`.

## Reused utilities

- `getJokerEffectsAtLevel(jokerId, level)` from `src/utils/jokerEffectEngine.ts`
- `JOKER_IDS.DEPOSIT_BONUS` from `src/constants/jokerIds.ts`
- "Debt paid" math from `app/piggy-bank.tsx:137` (`stashedAmount + adoptionFee`) — same formula for `savings`
- Existing `GoingToSchoolModal` allowance row style for the confiscation row

## Verification

1. **Unit:** `npx jest src/__tests__/utils/morningCarryCap.test.ts` — table-driven across Lvl 1 / 5 / 10 / 13 / 16 × savings $0 / 50% / 100% / 200% × Deposit Bonus L0/L1/L2/L3.
2. **Integration:** start a run, end Day 1 with $500 wallet on Lvl 1 (cap $100), sleep, expect Day 2 morning balance = $100 + allowance.
3. **Manual play:**
   - Lvl 1 fresh game, end Day 1 with $500 wallet / $0 stash → expect $400 confiscated, modal shows cap $100.
   - Same run, stash $5k+ to clear debt, then earn $1k extra → savings $1k → cap = max($100, $100) = $100. Earn $5k extra → savings $5k → cap = $500.
   - Lvl 5 game → confirm $2k floor on Day 1 morning.
   - Pick up Deposit Bonus L1 → cap percentage shifts from 10% to 15%; verify in modal breakdown and on next morning.
4. **Lint/typecheck:** `npm run lint` and confirm no new TS errors in modified files (pre-existing errors in `EventModal.tsx`, `firebase.ts`, etc. are ignored per CLAUDE.md).
5. **Coverage:** `npm run test:coverage` — keep above 70% threshold.

## Open questions / future work

- If we want stash to keep mattering for the cap at Lvl 13–16, replace the flat `$100k` ceiling with `min(100_000, adoptionFee × 0.05)` or similar.
- Consider a tutorial/intro modal the first time confiscation triggers ("Your parents took $X. Stash more to bring more tomorrow.").
- Possible future joker: "Hidden Pocket" — increases carry cap absolute ceiling.
