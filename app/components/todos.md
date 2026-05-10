Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
Haunted School Subplot — Comedic, Outsiders Confirm, Insiders Don't

Context

Sugar Wars is a candy-trading school sim with a 5-day loop and a difficulty ladder (1–16, mechanical scaling
kicks in at diff > 3). The user wants a haunted-school subplot, dropped as hints, intensifying with difficulty.

Tone: Mostly comedic. Inside the school, faculty/PA/students treat the haunting as routine workplace
inconvenience (the lunch-lady ghost knocked over the rack again). Like Beetlejuice meets What We Do in the
Shadows.

Reveal split (key tonal device):

- Outsiders — the deli owner, The Connect (merchant) — talk about the school as explicitly haunted. "You
  shouldn't go to that school, kid." "That place is haunted, you know that, right?" They name it.
- Insiders — faculty PA announcements, shopkeeper-style dialogue inside the school, period flavor text — treat it
  as mundane. Never use the word "haunted." Specifics imply ghosts without confirming.

The contrast is the joke: the player keeps hearing from outsiders that the school is haunted, while everyone
inside acts like it's a perfectly normal Tuesday.

Constraints from user feedback:

- No stash-lock-style haunted events (don't reuse the STASH_LOCKED mechanic for ghost gags)
- No music changes
- Minimal new art (2–3 background images max)
- Joker renames and minigame renames are fair game as additional ambient carriers

The cheapest delivery is data added to existing carriers, weighted by difficultyLevel. Seeded determinism
preserved.

The Arc (4 acts, gated by difficulty)

┌──────────────────┬────────────┬────────────────────────────────────────────────────────────────────────────┐
│ Act │ Difficulty │ What the player sees │
├──────────────────┼────────────┼────────────────────────────────────────────────────────────────────────────┤
│ I. Background │ 1–3 │ A weird PA announcement every few runs. Otherwise normal. │
│ noise │ │ │
├──────────────────┼────────────┼────────────────────────────────────────────────────────────────────────────┤
│ II. Outsiders │ │ Deli owner drops a "you sure you want to go back to that school?" line in │
│ start commenting │ 4–6 │ friendship dialogue. Inside the school, flavor text gets specifically │
│ │ │ weird ("locker 312 is rattling again"). │
├──────────────────┼────────────┼────────────────────────────────────────────────────────────────────────────┤
│ III. The Connect │ │ The Connect (merchant) opens with haunted-school remarks. New seeded │
│ joins in │ 7–9 │ haunted events (price drops because "the cafeteria thing tipped the rack │
│ │ │ again," money found "in your bag, you didn't put it there"). │
├──────────────────┼────────────┼────────────────────────────────────────────────────────────────────────────┤
│ IV. Saturated │ 10+ │ Same content, much higher frequency. Story-screen gains one new line. No │
│ │ │ reveal screen. │
└──────────────────┴────────────┴────────────────────────────────────────────────────────────────────────────┘

The 7 Hint Channels

1.  Period flavor text — start here

- File: src/context/FlavorTextContext.tsx (flavorLibrary)
- Change: Add 'HAUNTED_WHISPER' event type with 6–10 line pool. Hook into usePeriodEventFlavorText for a
  difficulty-weighted roll each period (0.05 + 0.02 \* (difficulty - 3), zero below diff 4).
- Sample lines (insider-mundane, never says "haunted"): "Locker 312 is rattling on its own again." / "Ms.
  Henderson asks the empty seat in row 3 to please stop chewing." / "The ice machine in the cafeteria is humming.
  Nobody plugged it in." / "Someone's gum tastes like 1987."

2.  Event hints (one period early)

- File: utils/generateSeededGameData.tsx (loseMoneyHints, foundMoneyHints arrays around lines 94–131). Skip
  stashLockedHints per user direction.
- Change: Add 5–8 comedic-haunted variants per array. At difficultyLevel >= 4, replace ~25% of normal hints with
  haunted ones. At >= 8, raise to ~50%.
- Sample variants: (LOSE_MONEY) "the third-floor kid is in a mood today" / (FOUND_MONEY) "you find $3 in your
  pocket. you don't remember those being your jeans."

3.  End-of-day tip — comedic PA announcements

- File: src/constants/gameTips.ts (rendered by SchoolsOutModal.tsx, 2.8s daily)
- Change: Add a HAUNTED_TIPS array (~15 entries) written as deadpan PA announcements / faculty handbook excerpts.
  At difficulty >= 4, weighted swap a normal tip for a haunted one.
- Sample tips: "REMINDER: stairwell B does not count as a chaperone for field trips." / "Faculty handbook §14.2:
  candy left in third-floor lockers overnight will be considered an offering." / "Students are reminded that the
  boys' bathroom mirror is for grooming purposes only. We mean it this time." / "The PE teacher would like to
  remind everyone that he has been alive this whole time."
- Strongest carrier. Deadpan PA format does most of the comedic work for free.

4.  Deli owner / shopkeeper — outsider perspective, says "haunted" out loud

- File: src/constants/shopkeeperData.ts (SHOPKEEPER_DIALOGUE, level-gated). The shopkeeper is the deli owner.
- Change: Add 5–7 haunted-themed lines to mid+high dialogue tiers, filtered into rotation when difficultyLevel >=

4. These lines explicitly use the H-word — outsider perspective is the joke.

- Sample lines: "You sure you want to go back to that school today? Place is haunted, you know that, right?" /
  "My uncle worked there in '78. Said the boiler room used to talk back. Anyway, what'll it be." / "I don't sell to
  no kids who go to that school after dark. You ain't going there after dark, are you?" / "Freezer's been empty
  since Tuesday. Place is haunted? I dunno. Could be." / "Tell your principal that scaring my customers ain't doing
  him any favors."
- Per the user's specific request — the deli owner is the primary "this place is haunted" voice.

5.  The Connect (merchant) — second outsider voice

- File: Look at src/store/slices/merchantSlice.ts and any app/merchant-shop.tsx (or wherever Connect dialogue
  lives) — locate or add a dialogue array. If The Connect doesn't have a dialogue system yet, this becomes a new
  (small) array of greeting lines selected on shop-open.
- Change: At difficultyLevel >= 7, The Connect's greeting line gets a haunted-themed pool. The Connect is more
  conspiratorial than the deli owner.
- Sample lines: "Heard you're still going to that school. Bold." / "I don't ask what you're trading at. But that
  school? Mhm." / "Got a discount for the haunted-school crowd. Not really. Just felt like saying it."

6.  New seeded haunted events (Act III, no STASH_LOCKED reuse)

- Files: utils/generateSeededGameData.tsx (event generation), app/components/EventModal.tsx (background image
  switch)
- Change: Add 2 new effect strings, both not stash-related:
  - 'CAFETERIA_GHOST' — PRICE_DROP variant: "the lunch-lady thing tipped the candy rack, everyone's grabbing
    free." (forces a price drop on a chocolate/sour candy that period)
  - 'AFTER_BELL' — FOUND_MONEY variant: "you find candy in your bag you don't remember buying. don't ask." (small
    free-candy windfall)
  - Optional 3rd: 'PHANTOM_SALE' — PRICE_SPIKE variant: "every kid in third period swears they bought from a
    vending machine that doesn't exist. demand is through the roof." (forces a price spike)
- Generation only emits these when difficultyLevel >= 7.
- Art: 2–3 new modal backgrounds (cafeteria-with-tipped-rack, empty-locker-row, vending-machine-shadow). Stay
  cute, not creepy.

7.  Joker renames (persistent ambient channel)

- Files: src/utils/jokerEffectEngine.ts (the STANDARDIZED_JOKERS array — 54 jokers), src/constants/jokerIds.ts if
  names live there, and docs-site/src/data/jokers.json for the public docs page
- Change: Rename ~6–10 jokers (out of 54) to haunted-themed names. Keep mechanics identical. Pick jokers whose
  names already lean spooky-adjacent or whose effect could plausibly be reframed. Rename only — no description
  rewrites unless trivial.
- Examples: "Medieval Shield" → "Cursed Shield." "Bus Driver's Whistle" → "Substitute's Whistle" (last sub
  vanished, you got the whistle). "Diamond Hand" → "Ghost Hand." "Beast" → "Beast in the Walls." Pick the cleanest
  6–10.
- Why it works: Joker names appear in 4 places (jokers tab, joker card modal, transaction modal, docs site) —
  high persistent visibility. Players see them every run. Subtle theme reinforcement at zero animation/art cost.

8.  Minigame renames (low-cost flavor)

- Files: Any minigame label/title source. Likely in each app/minigames/\*.tsx or a shared title constant. Verify
  location during implementation.
- Change: Rename 2–3 of the 9 minigames to haunted-themed alternates. Keep mechanics identical. Examples:
  - "Recess" → "After Recess" (everyone left, you didn't)
  - "Final Exam" stays (already fits)
  - "Math" / "Logic" → "Substitute's Math" / "After-Hours Logic"
- Don't rename all 9 — selective theming reads as "this school is weird," not "the game is a horror game."

9.  Story-screen single line (Act IV bookend)

- File: app/story-screen.tsx
- Change: At difficultyLevel >= 10, add one typewriter line to the existing intro: "Yeah. That school." Or: "The
  building is older than it looks." That's it. No new screen, no game-end reveal. Insider voice, never says
  "haunted."

(Channels 6 and 7 from the previous draft — music sting, game-end epilogue — are dropped per user direction.)

Recommended Phasing

- Phase 1 (data-only, ~3–5 hrs): Channels 1, 2, 3 — flavor text, event hints (no stash-lock variants),
  PA-announcement tips. Diff 4+ only.
- Phase 2 (~3–4 hrs): Channels 4 + 5 — deli owner haunted dialogue, plus The Connect haunted greetings.
- Phase 3 (~2 hrs): Channels 7 + 8 — joker renames (~6–10) and minigame renames (~2–3). Pure string changes,
  broad visibility, ships any time.
- Phase 4 (asset + code, ~6–10 hrs): Channel 6 — 2–3 new haunted event types and 2–3 new modal background images.
- Phase 5 (~10 min): Channel 9 — one new typewriter line in story-screen at diff 10+.

Phases 1, 2, 3 alone deliver a saturated subplot without any new art.

Critical Files

Phase 1:

- src/context/FlavorTextContext.tsx — flavorLibrary, add HAUNTED_WHISPER
- src/constants/gameTips.ts — add HAUNTED_TIPS pool
- utils/generateSeededGameData.tsx — extend loseMoneyHints / foundMoneyHints arrays (~lines 94–131); skip
  stashLockedHints
- src/hooks/usePeriodEventFlavorText.ts — difficulty-weighted roll for HAUNTED_WHISPER
- app/components/SchoolsOutModal.tsx — diff-weighted swap to HAUNTED_TIPS
- src/store/slices/walletSlice.ts — selectDifficultyLevel (already exists)

Phase 2:

- src/constants/shopkeeperData.ts — SHOPKEEPER_DIALOGUE
- src/store/slices/merchantSlice.ts + The Connect's screen file — locate or add greeting-line array

Phase 3:

- src/utils/jokerEffectEngine.ts — STANDARDIZED_JOKERS names
- src/constants/jokerIds.ts — if names live here too
- docs-site/src/data/jokers.json — public docs (already in dirty git status, so it's actively maintained)
- app/minigames/\*.tsx — minigame title strings

Phase 4:

- utils/generateSeededGameData.tsx — add CAFETERIA_GHOST / AFTER_BELL / PHANTOM_SALE to event generation
- app/components/EventModal.tsx — wire new background images
- assets/images/events/ (or current event-art folder) — drop in 2–3 new backgrounds

Phase 5:

- app/story-screen.tsx — one new line at diff ≥ 10

Design Principles

1.  Insider/outsider tonal split is the engine. Outsiders (deli owner, The Connect) say "haunted." Insiders (PA,
    faculty, in-school flavor text) treat it as routine. The mismatch is the joke.
2.  No stash-lock-themed haunted events. Per user direction, ghost gags use price/money channels only.
3.  No music changes. Per user direction.
4.  Minimal new art. Cap at 2–3 background images for new haunted events. No sprite work, no UI overlays.
5.  Joker/minigame renames are pure string changes. Don't change mechanics, descriptions, or balance.
6.  Plausible deniability at low difficulty. One haunted entry per pool at diff 4+. No haunted content below
    diff 4.
7.  Determinism. All RNG through the seed system. Same seed + difficulty = same haunting.
8.  No payoff screen. No game-end reveal. The bit never breaks.

Verification

1.  Phase 1 firing: Use the Jump to Day 5 debug button in settings (already added in the previous redesign), set
    difficultyLevel = 5, play 1 day. Check ≥1 haunted flavor line and a HAUNTED_TIPS PA announcement appear. Then
    difficultyLevel = 1, confirm zero haunted content.
2.  No stash-lock haunted variants: grep new haunted strings for "stash" / "locked" / "safe"; should return zero
    matches in haunted pools.
3.  Determinism: Fixed seed, two runs at difficultyLevel = 7. Same haunted lines at same periods.
4.  Phase 2 outsider voices: Visit deli at shopkeeper level ≥ 5, difficultyLevel = 5, talk to owner; verify ≥1
    haunted line in rotation. Visit The Connect at difficultyLevel = 7; verify haunted greeting fires.
5.  Phase 3 visibility: Open jokers tab, transaction modal, and docs site; confirm renamed jokers show new names
    everywhere.
6.  Phase 4 events: Force difficultyLevel = 8, fixed seed; verify a CAFETERIA_GHOST / AFTER_BELL / PHANTOM_SALE
    event triggers within 5 days with the correct background image.
7.  Insider/outsider audit: grep all haunted insider strings (flavor text, PA tips, in-school dialogue) for
    "ghost" / "haunted" / "spirit" / "possessed" / "dead" — must return zero. grep outsider strings (deli owner, The
    Connect) — those are allowed to use those words.
8.  Tone audit: Read every haunted string out loud. Deadpan PA voice should be funny, not unsettling. If creepy →
    rewrite.
