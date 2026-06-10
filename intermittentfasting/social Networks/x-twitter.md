# X/Twitter Posts — Intermittent Fasting Campaign

All posts under 280 chars (or threaded). Tone: honest, conversational. No launch hype — just someone sharing what they built and why.

---

## Tweet 1 — Tease (June 10)

> Building a fasting tracker for @EvenRealities G2 glasses. Timeline bar on the display, 7 presets (14:10 to OMAD), EN/FR. Fully offline.
>
> What would you want a glasses-based fasting tracker to do that a phone app can't?

**Visual:** G2 display mockup showing timeline mode

---

## Tweet 2 — Launch (June 13)

> Intermittent Fasting for Even Realities G2 is on the Even Hub Store.
>
> Shows your fasting window on the glasses display — timeline bar or text mode. 7 presets, custom schedules, phase transition notifications. EN/FR. No account, no cloud, no tracking.
>
> Even Hub → search "Intermittent Fasting"

**Visual:** Hero image (glasses mockup + companion UI)

---

## Tweet 3 — Feature Thread (June 14)

**Tweet 1/5:**
> Some details on the Intermittent Fasting app I built for G2 — a short thread 🧵

**Tweet 2/5:**
> It has two display modes. Text mode puts the countdown in the upper corners — minimal, doesn't get in the way. Timeline mode gives you a full-width Unicode progress bar that fills as you progress. Double-tap to switch.

**Tweet 3/5:**
> 7 presets: 14:10 (beginner), 16:8 (Leangains), 18:6, 20:4 (Warrior), OMAD, 5:2, and alternate day fasting. Or set your own custom start and end times from the companion app.

**Tweet 4/5:**
> Phase transitions. When you cross from eating to fasting window, the glasses briefly show "FASTING" and your phone gets a notification + sound. Works the other way too. Useful if you lose track of time — which I do constantly.

**Tweet 5/5:**
> Privacy: everything is in localStorage. No account creation, no server, no analytics, no data collection. The config lives on your device.
>
> English and French. Dark and light theme on the companion app.
>
> On the Even Hub Store now.

---

## Tweet 4 — Dev Perspective (June 18)

> Building for the G2 display forces interesting constraints. 576×288 pixels, 4-bit greyscale, no CSS or DOM — just a canvas and containers. Unicode block characters for the progress bar because there's no native drawing API that survives container updates.
>
> Constraints make you strip things down to what actually matters.

---

## Tweet 5 — Wrap-up (June 24)

> First week of Intermittent Fasting on G2. What shipped: 7 presets, timeline + text modes, phase notifications, EN/FR, dark/light theme, fully offline.
>
> What didn't: multi-language beyond EN/FR (coming), image persistence across mode switches (working on it).
>
> Next: whatever people ask for. What would you change?

---

## Profile Bio (during campaign)

> Building things for @EvenRealities G2. Intermittent Fasting tracker, smart glasses experiments. 🇫🇷
> Even Hub → "Intermittent Fasting"
