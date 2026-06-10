# Discord Announcements — Intermittent Fasting Campaign

Target servers: Even Realities community Discord, smart glasses servers, quantified self communities.
Tone: helpful, direct, no marketing language. Talk like you're sharing with peers.

---

## Announcement 1 — Community Tease (June 12)

**Channel:** #showcase or #app-development

> Hey — I've been working on a fasting tracker for Even Realities G2 and wanted to share it here before putting it on the store. Would love some eyes on it.
>
> **What it does:** Shows your fasting window on the glasses display. Timeline bar, countdown, phase labels. You configure it once from the companion app on your phone, then the glasses update on their own.
>
> **Presets:** 14:10 (beginner), 16:8 (Leangains), 18:6, 20:4 (Warrior), OMAD, 5:2, alternate day fasting. Custom schedules too.
>
> **Display modes:** Text (countdown in corners) or Timeline (full-width progress bar with status label). Double-tap to switch.
>
> **Other:** Phase transition notifications (glasses + phone + sound), English and French, dark and light theme, everything in localStorage — no accounts, no servers, no analytics.
>
> I'd really appreciate feedback from people who actually use G2 daily. What presets am I missing? Any SDK quirks I should know about for the display modes? Does the double-tap-to-switch pattern feel right?
>
> Store listing isn't up yet — will post the link here once it is. Thanks for any thoughts.

*(attached: screenshot of timeline mode on G2 display)*

---

## Announcement 2 — Launch (June 13)

**Channel:** #releases or #showcase

> Intermittent Fasting is now on the Even Hub Store for G2.
>
> Shows your fasting window on the glasses — progress bar, countdown, current phase. Config once from the companion app, then the glasses handle it.
>
> **Features:**
> - 7 presets (14:10 to OMAD, ADF) + custom schedules
> - Two display modes — text in corners or full-width timeline bar
> - Phase transition alerts on glasses + phone notification + sound
> - English and French
> - Dark and light theme
> - Fully offline — localStorage only, no accounts, no tracking
>
> **Install:** Even Realities App → Hub → "Intermittent Fasting"
>
> **Known limitations:** Only double-click reliably reaches custom handlers on G2 (SDK thing, not on our end). Image containers get killed on rebuildPageContainer — working on a fix. Phase notification sound works when the companion page is open in the phone browser.
>
> Feedback and bug reports welcome here or on GitHub.

*(attached: glasses display screenshot, companion UI screenshot, QR code)*

---

## Announcement 3 — Week 1 Check-in (June 22)

**Channel:** same thread or #showcase

> One week since the Intermittent Fasting app went up on Even Hub. Quick update on where things stand.
>
> **What's working:** Timeline mode seems to be what most people prefer over text mode. The progress bar with block characters renders cleanly on the display. Phase transition notifications are reliable.
>
> **What needs work:** Image persistence across display mode switches (rebuildPageContainer kills image containers). Only EN/FR for now — expanding to ES/ZH/JA/PT is next but needs proper testing on the display for CJK character rendering.
>
> **What's next:** Whatever you tell me. More presets? Custom phase labels? Apple Health write? Different display styles? I'm building this based on actual use, not a roadmap.
>
> If you've tried it — what would make it more useful for you?

*(attached: poll — "What should I work on next?" — More languages / Apple Health / Custom labels / Different display styles)*

---

## Quick Replies (for Q&A in threads)

**Q: Does it need the phone after setup?**
> No. Once you set your schedule in the companion app, the glasses display updates on its own. You only need the phone to change settings.

**Q: What data does it collect?**
> Nothing. The config is a JSON object in localStorage. No network calls, no analytics, no accounts. If you delete the app, there's nothing left anywhere.

**Q: Why a glasses app instead of a phone app?**
> I found myself opening a phone app multiple times a day just to check a timer. With the G2 the information is already there — no unlocking, no app switching. It's a small thing but it removes friction from something you do repeatedly.

**Q: Can I add my own presets?**
> You can set custom start and end times in the companion app. Fully custom presets (saved and named) aren't there yet but it's on the list based on feedback.

**Q: 12-hour time format?**
> Yes — toggle between 12h (with AM/PM) and 24h in the companion app settings.
