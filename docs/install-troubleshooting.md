# "The app won't install" — troubleshooting

The 1.0.0 + 1.0.3 history covers almost every way an Android install can fail,
so this page starts with the actual cause of each and then the general list.

---

## If you are on 1.0.3 or later and it still fails

**Check the file size first.** `CellWarriors-<ver>.apk` must be **14 MB**
(14,989,480 bytes for 1.0.3). If your download is a few hundred KB, or the
browser saved a `.htm` / `.html` file, you got GitHub's *web page* instead of
the binary — that is the single most common cause. Fix: open
`releases/CellWarriors-1.0.3.apk` in the repository file list and press
**Download raw file** (the ⤓ icon), rather than saving the page.

**Verify what you downloaded:**

```bash
sha256sum CellWarriors-1.0.3.apk
# must equal the value in CellWarriors-1.0.3.apk.sha256 and in the README
```

**Android version.** 1.0.0 could not install on Android 11 or newer at all — its
`resources.arsc` was deflated, which the package parser rejects outright with
`INSTALL_PARSE_FAILED_RESOURCES_ARSC_COMPRESSED`. 1.0.3 fixes that. It requires
Android 7.0 (API 24) or newer.

**"App not installed" / "package appears to be invalid"** with a correct-size
file and a matching checksum means the APK was modified in transit (a download
manager, antivirus, or a messenger app re-wrapping it). Re-download from the
release page and check the hash again.

**"App not installed" when upgrading from 1.0.0.** Expected, once —
see the next section.

**Play Protect** may warn about an unknown developer on first install. That is
normal for a sideloaded APK: choose **Install anyway**.

**Permission to install.** Android blocks APKs from apps it does not trust:
Settings → Apps → *your browser or file manager* → **Install unknown apps** →
allow. Then open the file.

---

## Upgrading from 1.0.0

The 1.0.0 APK was signed with a key that was **not** stored in the repository
(a build-time `.gitignore` mistake, now fixed). That key no longer exists, so
1.0.3 cannot be installed *over* it — Android refuses with
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

**Uninstall the old one first, then install 1.0.3.** You lose local progress
(there is no cloud save yet).

From 1.0.3 onward the signing key is committed as `android/release.keystore`
and its fingerprint is pinned in `android/build.sh`, so this cannot happen
again: every future version installs straight over the previous one.

The key is intentionally public. It is not a secret — the game has no server,
accounts, or paid content — it exists only to give the app a stable install
identity. Anyone can build a look-alike APK signed with it, exactly as they
could for any open-source Android game; install from this repository's release
page and you are getting the real thing.

---

## Building it yourself

```bash
android/fetch-tools.sh build/tools        # JRE, aapt2, ecj, d8, apksigner
CW_TOOLS=$PWD/build/tools JAVA_HOME=$PWD/build/tools/java bash android/build.sh
python3 scripts/check-apk.py dist/CellWarriors-1.0.3.apk
```

The build refuses to produce a release APK that Android would reject:

| guard | catches |
|---|---|
| step 8 | `resources.arsc` / `classes.dex` forced to **stored** before zipping |
| step 8 | `scripts/align-apk.py` aligns stored entries when `zipalign` is absent |
| step 9 | signing certificate SHA-1 must match the pinned value |
| step 10 | `scripts/check-apk.py` re-checks compression, alignment and the signing block on the finished APK |
| step 10 | `aapt2` checks package id, minSdk, launcher activity, landscape lock, every asset |
| step 11 | copies the APK into `releases/` so the download link can never go stale |

`node scripts/apk-sim.mjs` additionally unpacks the built APK and boots its web
app on an opaque `file://` origin, and asserts the archive is installable.
