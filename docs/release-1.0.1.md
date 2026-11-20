# Cell Warriors v1.0.1 — install fix

**1.0.1 exists because 1.0.0 would not install on Android 11 or newer.** If you
tried 1.0.0 and got "App not installed" or "package appears to be invalid",
this is the fix.

## What was wrong

The APK's `resources.arsc` — the compiled resource table every Android app
carries — was **compressed**. Since Android 11 (API 30) the package parser
requires that entry to be stored uncompressed and 4-byte aligned, and rejects
any package that is not, before a single line of app code runs:

```
INSTALL_PARSE_FAILED_RESOURCES_ARSC_COMPRESSED
```

`aapt2` linked the table correctly. Our repack step then re-zipped the whole app
with `zip -9`, re-compressing it — so the defect was introduced *after* the
resource compiler had done the right thing, which is why nothing in the test
suite noticed: the web app inside the APK was perfect, and it played fine in
simulation. It just could never be installed on a current phone.

## What else this release fixes

**The signing key was not in the repository.** `android/release.keystore` was
listed in `.gitignore`, so every fresh checkout generated a *different* key and
therefore a different install identity. Any future release would have failed to
upgrade over the last one with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. The key is
now committed and its SHA-1 is pinned in the build, which fails loudly if it
ever changes again. The key is deliberately public — there is no server, no
account and no paid content — it exists only so the app has a stable identity.

**No more "zipalign unavailable" release.** The build used to ship unaligned
APKs when the `zipalign` binary was missing. `scripts/align-apk.py` now does the
alignment itself; stored entries land on their required boundaries in every
build.

## Guards, so this cannot ship again

| guard | catches |
|---|---|
| `scripts/check-apk.py` | deflated/misaligned `resources.arsc`, unaligned `classes.dex`, broken signing block |
| build step 9 | signing certificate changed (pinned SHA-1) |
| build step 10 | runs the checker on the finished APK; a failure aborts the build |
| `scripts/apk-sim.mjs` | asserts installability of the actual artifact, not just the web app |
| build step 11 | `releases/` is refreshed every build, so the download cannot go stale |

The 1.0.0 APK fails `check-apk.py` with nine problems; 1.0.1 passes. That
negative test is how the fix was verified.

## Upgrading from 1.0.0

You must **uninstall 1.0.0 first** — it was signed with the key that no longer
exists — then install 1.0.1. Local progress is lost. This is a one-time step:
from 1.0.1 onward, upgrades install over the top.

## Install

1. Download `CellWarriors-1.0.1.apk` (14 MB) from the release page using
   **Download raw file**, not the browser's "save page".
2. If prompted, allow your browser or file manager to install unknown apps.
3. Play Protect will warn about an unknown developer — **Install anyway**.
4. Verify with `sha256sum` against the published value:
   `d3e19f96d713c90c7e19ef96fbadfb94248075e2645d9e199d842debacec8942`

Full troubleshooting: `docs/install-troubleshooting.md`.

## Verify

| suite | checks |
|---|---|
| `npm run test:e2e` | 162 |
| `npm run test:phone` | 144 |
| `npm run test:apk` | 22 |
| `npm run test:run` | 5 |

Requires Android 7.0 (API 24)+. 14 MB, offline, no permissions beyond storage
for the local save.
