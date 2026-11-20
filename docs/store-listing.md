# CELL WARRIORS — PLAY STORE PACK

Everything the console asks for, pre-written. Copy-paste, don't improvise at 2am.

---

## 1. Identity

| Field | Value |
| --- | --- |
| App name (≤30) | `Cell Warriors: Immune RPG` |
| Package name | `[com.yourname.cellwarriors]` — **permanent, cannot change after first upload** |
| Category | Games → Card |
| Tags | Card battler, Strategy, Anime, Single player |
| Content rating | Everyone 10+ (see §4) |
| In-app purchases | No (v1) |
| Ads | **No** |
| Price | Free |

## 2. Listing copy

**Short description (≤80 chars)**
```
Tactical card battles inside a teenager's body. Fever is a weapon. No ads.
```

**Full description**
```
You are not a hero. You are the immune system.

Cell Warriors is a tactical card game fought inside the body of a seventeen-year-old
during the worst week of his life. Build a deck of cells and cytokines, hold the line
against pathogens that spread every turn, and decide when to burn the body with fever
to save it.

EVERY TURN IS A CALCULATION
Three numbers decide the fight: ATP for energy, Inflammation for risk, and Infection
for time. Push too hard and fever burns your own cells. Play too safe and the host is lost.

REAL IMMUNOLOGY, AS A MECHANIC
Neutrophils are messy. Killer T pierces armour. B Cells build antibodies that compound.
Mast Cells spike inflammation and make everything worse — then save you. No quizzes.
No "did you know". The science is the strategy.

A CAST THAT EARNS ITS KEEPS
A burned-out veteran who arrives first and dies first. An ace who has never lost.
A platelet with an oversized first-aid kit and no plan. A silent giant with a cleaver.

NO ADS. NO PURCHASES. NO STAMINA TIMERS.
Play as much as you want, whenever you want. Earn stem cells in adventure to
differentiate new cells. You cannot buy pulls — there is nothing to buy.

Anime key art. Six body regions. One host. Hold the line.
```

**What's new (≤500 chars, v1)**
```
First release. Six regions of adventure, six combatants, one lean 5-card kit
each, one fever mechanic that will
ruin your best-laid plan.
```

## 3. Store assets checklist

| Asset | Spec | Status |
| --- | --- | --- |
| App icon | 512×512 PNG, 32-bit, no transparency, mark at 84% | ⬜ |
| Feature graphic | 1024×500 PNG | ⬜ |
| Phone screenshots | 1080×1920, **min 4, max 8** | ⬜ 4 needed |
| 7" tablet screenshots | optional | ⬜ |
| Promo video | optional, YouTube URL | ⬜ |

**Screenshot order that converts** (do not use a title screen as shot 1):
1. The fight, mid-combo, fever meter near max — with a 4-word caption
2. The "no ads, no purchases" promise screen
3. Character splash of the cast
4. Adventure map with the body
5. Deck builder

Captions: 3–4 words, display font, crimson on dark. Never a paragraph.

## 4. Content rating (IARC questionnaire — expected answers)

| Question | Answer | Note |
| --- | --- | --- |
| Violence | **Mild, fantasy/cartoon** | Cells fight pathogens; stylised, no gore |
| Blood | **No** | We do not draw realistic blood — if we do, declare "mild" |
| Fear | No | |
| Sexual content | No | |
| Profanity | No | |
| Drugs / alcohol / tobacco | No | |
| Gambling | **No** | No paid pulls, no loot boxes → keeps us out of gambling disclosure |
| User-generated content | No (v1) | Add "users can interact" only when PvP chat ships |
| Purchases | No (v1) | |
| Data collection | See §5 | |

**Target audience:** 13+. Declaring under-13 pulls the app into the Families programme and
requires a certified ad SDK plus stricter review. Do not tick it unless the game truly is for kids.

## 5. Data safety form (must match docs/privacy-policy.md exactly)

| Section | Answer (v1) |
| --- | --- |
| Does your app collect or share data? | **No** (local saves + no accounts) |
| Data encrypted in transit | Yes |
| Data deletion request method | Uninstall / contact email |
| Crash logs | Declared as "app functionality" if the crash SDK is added |

If accounts ship later, this form changes **before** the release, not after.

## 6. Release checklist (do this once, in order, calmly)

1. Generate an upload keystore; **back it up in two places**. Losing it = losing the app.
2. Enable Play App Signing.
3. Set `versionCode` / `versionName`; never reuse a versionCode.
4. Build release APK/AAB → test on a real mid-range phone, not an emulator.
5. Internal testing track → 10 testers → fix crashes for one week.
6. Closed testing (12 testers, 14 days) — required before production for new personal accounts.
7. Fill store listing, content rating, data safety, privacy URL.
8. Roll out to production at 20%, watch crashes 48h, then 100%.

## 7. ASO — what people actually search

Primary keywords (put these in the description naturally, never as a list):
`card game`, `deck builder`, `anime game`, `strategy card battle`, `offline card game`,
`no ads card game`, `biology game`, `immune system game`.

The differentiator nobody else can copy: **"no ads, no purchases, nothing to buy"** — put it in the
first 80 characters of the short description and in the second screenshot.

## 8. Hard rules

- Never mention a competitor by name.
- Never claim medical or educational accuracy — say "inspired by real immunology".
- Never promise a feature you haven't shipped.
- Never buy installs or reviews. It is detectable and it is permanent.
