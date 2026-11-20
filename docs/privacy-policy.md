# CELL WARRIORS — PRIVACY POLICY

> **Template notice:** this is a working draft, not legal advice. Fill every `[…]` before publishing.
> Host it at `https://[your-domain]/privacy` — Play Store requires a public URL, an in-app link,
> and an email address.

**Last updated:** [DATE]
**App:** Cell Warriors (`[com.yourname.cellwarriors]`)
**Developer:** [YOUR NAME OR ENTITY], [CITY], India
**Contact:** [privacy@your-domain]

---

## 1. The short version

Cell Warriors is a single-player card game. **Version 1 has no account, no ads, and no tracking
across other apps.** Your progress is stored on your own device. We do not sell data, and we do
not show advertising.

## 2. What we collect

**Version 1 (no account)**

| Data | Where it lives | Why |
| --- | --- | --- |
| Game progress, deck, currency | Your device only (local storage) | So the game remembers where you were |
| Crash reports (if enabled) | Sent to the crash service, no personal data | To fix bugs |

Deleting the app deletes all of it. We cannot recover it, because we never had it.

**If and when accounts are added (v2)** — this policy will be updated first, and you will be asked
in-app before anything is sent. The list will be limited to: email address, display name,
progress sync, and purchase receipts. Nothing else.

## 3. What we never do

- No advertising SDKs, ever. No ad identifiers, no tracking pixels.
- No sale or rental of personal data.
- No access to contacts, photos, microphone, camera, or location.
- No behavioural profiling of players.

## 4. Third parties

| Service | Role | Data seen |
| --- | --- | --- |
| Google Play | App distribution, crash and ANR reports | Install and crash metadata per Google's policy |
| Vercel | Hosts our website | Standard web server logs (IP, user agent) |
| [Supabase — when accounts launch] | Account and progress sync | Email, display name, progress |

## 5. Children and teenagers

Cell Warriors is intended for players **13 and older**.

- We do not knowingly collect personal information from anyone under 13. If you believe a child
  under 13 has sent us personal data, email [privacy@your-domain] and we will delete it.
- Because version 1 stores nothing on our servers, no parental consent flow is required to play.
- **If accounts are added**, players under 18 in India (DPDP Act) and under 16 in parts of the EU
  will require verifiable parental consent before any personal data is processed. That requirement
  will be built before accounts ship, not after.

## 6. Your rights

Even with almost nothing collected, you have the right to ask what we hold about you, request
deletion, and object to processing. Email [privacy@your-domain]; we answer within 30 days.
To delete everything in version 1, uninstall the app.

## 7. Security

Data in transit is encrypted (HTTPS). When accounts launch, progress data will be protected with
row-level security so one player cannot read another's data.

## 8. Changes

If this policy changes materially, the update will appear in the app and on the website before it
takes effect. The "last updated" date always reflects the current version.

## 9. Governing law

This policy is governed by the laws of India. Disputes are subject to the courts of [CITY],
Maharashtra.

---

## Pre-launch checklist

- [ ] Every `[…]` replaced
- [ ] Page live at a public URL, HTTPS, no login wall
- [ ] Linked from the Play listing **and** from inside the app (Settings → Privacy)
- [ ] Contact email actually receives mail (test it)
- [ ] Answer the Play **Data safety** form to match this document exactly — mismatches cause rejection
- [ ] If accounts ship later: update §2, §3, §5 first, republish, then release the build
