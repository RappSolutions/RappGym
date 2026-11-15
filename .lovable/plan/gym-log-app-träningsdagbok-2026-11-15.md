# Gym log app (Träningsdagbok)

A mobile-first app to replace the Excel log, built for use on the phone in the gym. Swedish UI, matching the Excel and PDFs.

## What you get
1. **Idag / Pass (start screen)** – Pick a category (Push, Pull, Legs, Core). See the exercises in that category as big cards (code, name, equipment, sets × reps, focus tip). Your last weight and reps for each exercise show on its card.
2. **Quick logging** – Tap an exercise to open a small form. It is pre-filled with your last weight, reps and set count, so you usually just confirm. You can add a note. All entries from today are grouped into one session.
3. **Övningsbank** – Browse or search all 35 exercises from the four PDFs. Each one has its full instructions, muscle group, equipment and a history list with a simple progress chart.
4. **Logg** – A list of past sessions by date. You can edit or delete entries.
5. **Statistik** – The numbers from your overview sheet: total sets, sessions, reps, last workout date, and sets per category and per equipment.

## Data
- All exercises (codes PU1–PU10, PL1–PL10, LE1–LE10, CO1–CO5) are taken from the PDFs and Excel, including instructions, reps guidance and focus tips.
- Your existing log entries from the Excel file are imported, so your history starts out complete.
- Data is saved in Lovable Cloud with a simple login, so it is the same on your phone and computer.

## Technical details
- Lovable Cloud: tables `exercises` (seeded in the migration) and `log_entries` (user_id, date, set count, code, load as text so values like "Orange" bands work, reps, note). RLS limits each user to their own rows. Email/password auth.
- The Excel history is seeded into the first account that signs up (a one-time import with a button on the stats page).
- Routes: `/` (today), `/ovningar`, `/ovningar/$code`, `/logg`, `/statistik`, plus auth. A bottom tab bar on mobile.
- Design: dark, high-contrast "gym" theme with large touch targets and color-coded categories.
