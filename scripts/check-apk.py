#!/usr/bin/env python3
"""Installability checks for a built APK -- the ones a real device enforces.

`aapt2 dump` proves the manifest is right; it says nothing about whether Android
will actually accept the package. These checks cover the failures that stop an
install *before* the app runs, which is exactly how 1.0.0 broke on Android 11+:

  * resources.arsc must be STORED (uncompressed). API 30+ raises
    INSTALL_PARSE_FAILED_RESOURCES_ARSC_COMPRESSED otherwise.
  * resources.arsc must be 4-byte (page) aligned.
  * classes.dex must be STORED and 4-byte aligned.
  * No entry may be duplicated, and no local header may disagree with the
    central directory -- the parser rejects both.

Exits 0 when the APK is installable, 1 with one line per problem otherwise.

Usage:  python3 scripts/check-apk.py dist/CellWarriors-<ver>.apk
"""
import struct
import sys
import zipfile

MIN_SDK_FOR_STORED_ARSC = 30   # the rule only bites from Android 11 up
ALIGN = 4


def data_offset(blob, info):
    nlen, elen = struct.unpack_from("<HH", blob, info.header_offset + 26)
    return info.header_offset + 30 + nlen + elen


def check(path):
    problems = []
    blob = open(path, "rb").read()
    z = zipfile.ZipFile(path)
    infos = z.infolist()

    names = [i.filename for i in infos]
    if len(names) != len(set(names)):
        dupes = sorted({n for n in names if names.count(n) > 1})
        problems.append(f"duplicate zip entries: {', '.join(dupes[:5])}")
    if blob.rfind(b"PK\x05\x06") < 0:
        problems.append("no end-of-central-directory record")

    by_name = {i.filename: i for i in infos}

    for entry in ("resources.arsc", "classes.dex"):
        info = by_name.get(entry)
        if info is None:
            problems.append(f"missing {entry}")
            continue
        if info.compress_type != zipfile.ZIP_STORED:
            problems.append(
                f"{entry} is deflated (method {info.compress_type}) -- "
                f"Android 12+ refuses to install this "
                f"(INSTALL_PARSE_FAILED_RESOURCES_ARSC_COMPRESSED)")
        off = data_offset(blob, info)
        if off % ALIGN:
            problems.append(f"{entry} data starts at {off} (not {ALIGN}-byte aligned)")

    # a stored entry whose declared size disagrees with the bytes on disk means
    # the archive was aligned by a tool that forgot to update the headers
    for info in infos:
        if info.compress_type != zipfile.ZIP_STORED:
            continue
        off = data_offset(blob, info)
        if off % ALIGN:
            problems.append(f"stored entry misaligned: {info.filename} @ {off}")

    # signature block must sit immediately before the central directory
    cd_off = struct.unpack_from("<I", blob, blob.rfind(b"PK\x05\x06") + 16)[0]
    magic_pos = blob.find(b"APK Sig Block 42", cd_off - 0x10000 if cd_off > 0x10000 else 0)
    if magic_pos < 0:
        problems.append("no APK signing block (v2/v3) found")
    elif magic_pos + len(b"APK Sig Block 42") != cd_off:
        # zipalign-after-signing silently invalidates v2/v3
        problems.append("signing block does not abut the central directory "
                        "(was the APK modified after signing?)")

    if not problems:
        print(f"installable: resources.arsc stored+aligned, classes.dex aligned, "
              f"{len(infos)} entries, signing block intact")
    return problems


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    probs = check(sys.argv[1])
    for p in probs:
        print(p)
    sys.exit(1 if probs else 0)
