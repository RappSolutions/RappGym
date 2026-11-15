# Replace "Varv" with "Antal set" (repeat identical sets)

## What changes for you
- In the log drawer, "Varv" becomes **"Antal set"** (default 1). Did PU3 at 15 kg x 12 twice? Set it to 2 and press save once. That's it.
- The drawer opens with your last load and reps already filled in, so repeating the same set is quick.
- After saving, a small **"+1 likadant set"** button appears for a few seconds. It logs one more identical set without opening anything.
- Lists show "2 × 12 @ 15 kg" instead of "v2".
- Statistik counts correctly: 2 sets of 12 reps = 2 sets and 24 reps. Today one row always counts as one set.
- The exercise "dose" text (e.g. "3–4 varv × 10–12 reps") is shown as "set" in the app. I won't change your saved texts.

## Your imported Excel history
- First I check how the 72 imported rows store "varv". Today that number is a round number (1, 2, 3...), not a count.
- Rows that are separate rounds get "Antal set = 1", so your totals stay the same.
- Rows that said "4 varv" in one line get "Antal set = 4", so they finally count as 4 sets.
- I'll confirm the new totals against your Excel before finishing.

## Technical details
- Keep `log_entries.sets` column; its meaning changes from round index to repeat count (no schema change needed).
- LogSheet: rename stepper label, drop `defaultRound` (always 1 for new entries, keep the value when editing), add a sonner toast action "+1 likadant set" that inserts a copy of the saved row with sets=1.
- logg.tsx, ovningar.$code.tsx: display `sets × reps @ load`.
- statistik: total sets = sum(sets), total reps = sum(sets*reps).
- Data fix via a data query (not a migration): set sets=1 for per-round imported rows; set sets=N for "N varv" rows, based on the original Excel.
