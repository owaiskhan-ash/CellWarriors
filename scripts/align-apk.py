#!/usr/bin/env python3
"""Align an APK the way `zipalign -f -p 4` does -- without needing zipalign.

Android's package manager will not install an APK whose *stored* (uncompressed)
entries are mis-aligned. This matters far more than it used to: since Android 11
`resources.arsc` must be both uncompressed **and** page-aligned, and a stored
`classes.dex` should sit on a 4-byte boundary.

The approach here is the honest one: rewrite the archive, inserting padding into
each entry's local-header "extra" field so the entry data starts on the required
boundary, then rebuild the central directory to match. Compression method,
order, timestamps and CRC are all preserved, so the result is otherwise
byte-identical to its input and signs cleanly.

Usage:  python3 scripts/align-apk.py in.apk out.apk
"""
import struct
import sys
import zlib

# Entries Android inspects directly and therefore wants aligned. Everything
# stored gets 4-byte alignment; the string pool inside resources.arsc (typed
# arrays of 32-bit words) and the dex header both want it.
ALIGN_STORED = 4
# resources.arsc specifically wants page alignment on API 30+ ("-p 4" in
# zipalign means "page-align uncompressed .so files", but 4096 also satisfies
# the arsc requirement and costs at most ~4 KB).
PAGE = 4096

LOCAL_SIG = b"PK\x03\x04"
CENTRAL_SIG = b"PK\x01\x02"
EOCD_SIG = b"PK\x05\x06"


def read_eocd(data):
    pos = data.rfind(EOCD_SIG)
    if pos < 0:
        raise SystemExit("not a zip: no end-of-central-directory record")
    return pos


def parse_central_directory(data, eocd):
    (_sig, _disk, _cd_disk, _n_disk, total,
     cd_size, cd_off, _clen) = struct.unpack_from("<4s4H2IH", data, eocd)
    entries = []
    p = cd_off
    for _ in range(total):
        if data[p:p + 4] != CENTRAL_SIG:
            raise SystemExit(f"corrupt central directory at {p}")
        (sig, vm, vn, flags, method, mtime, mdate, crc, csize, usize,
         nlen, elen, clen, dstart, iattr, eattr,
         lho) = struct.unpack_from("<4s6H3I5H2I", data, p)
        name = data[p + 46:p + 46 + nlen]
        extra = data[p + 46 + nlen:p + 46 + nlen + elen]
        comment = data[p + 46 + nlen + elen:p + 46 + nlen + elen + clen]
        entries.append(dict(
            vmade=vm, vneed=vn, flags=flags, method=method, mtime=mtime,
            mdate=mdate, crc=crc, csize=csize, usize=usize, name=name,
            extra=extra, comment=comment, iattr=iattr, eattr=eattr,
            lho=lho,
        ))
        p += 46 + nlen + elen + clen
    return entries


def alignment_for(name, method):
    if method != 0:          # deflated data is never read in place
        return 1
    if name == b"resources.arsc":
        return PAGE
    return ALIGN_STORED


def main(src, dst):
    data = open(src, "rb").read()
    eocd = read_eocd(data)
    entries = parse_central_directory(data, eocd)

    out = bytearray()
    shifts = []
    for e in entries:
        # copy the original local header verbatim, keeping only its name
        lho = e["lho"]
        if data[lho:lho + 4] != LOCAL_SIG:
            raise SystemExit(f"bad local header for {e['name']!r}")
        (_s, _vn, _fl, _m, _t, _d, _crc, _cs, _us,
         nlen, elen) = struct.unpack_from("<4s5H3I2H", data, lho)
        name = data[lho + 30:lho + 30 + nlen]
        payload = data[lho + 30 + nlen + elen:lho + 30 + nlen + elen + e["csize"]]

        want = alignment_for(e["name"], e["method"])
        body = 30 + nlen                      # bytes before data, no extra
        pad = (-(len(out) + body)) % want if want > 1 else 0
        # extra field must be a list of (id, len, data) records to be valid;
        # a spanning "0x0000" record is exactly what zipalign emits for padding.
        if pad:
            if pad < 4:
                pad += want                   # a record needs 4 bytes of header
            extra = struct.pack("<HH", 0x0000, pad - 4) + b"\x00" * (pad - 4)
        else:
            extra = b""

        new_lho = len(out)
        out += struct.pack("<4s5H3I2H", LOCAL_SIG, e["vneed"], e["flags"],
                           e["method"], e["mtime"], e["mdate"], e["crc"],
                           e["csize"], e["usize"], nlen, len(extra))
        out += name
        out += extra
        assert len(out) % want == 0 or want == 1, (e["name"], len(out) % want)
        out += payload
        shifts.append((new_lho, len(extra)))

    cd_start = len(out)
    for e, (_lho, elen) in zip(entries, shifts):
        extra = struct.pack("<HH", 0x0000, elen - 4) + b"\x00" * (elen - 4) if elen else b""
        out += struct.pack("<4s6H3I5H2I", CENTRAL_SIG, e["vmade"], e["vneed"],
                           e["flags"], e["method"], e["mtime"], e["mdate"],
                           e["crc"], e["csize"], e["usize"],
                           len(e["name"]), len(extra), len(e["comment"]),
                           0, e["iattr"], e["eattr"], _lho)
        out += e["name"] + extra + e["comment"]
    cd_size = len(out) - cd_start

    out += struct.pack("<4s4H2IH", EOCD_SIG, 0, 0, len(entries), len(entries),
                       cd_size, cd_start, 0)

    open(dst, "wb").write(out)

    # Report, and verify the archive is still readable.
    stored = [(e["name"].decode(), alignment_for(e["name"], e["method"]))
              for e in entries if e["method"] == 0]
    print(f"aligned {len(entries)} entries ({len(stored)} stored)")
    for name, want in stored:
        if want > 1:
            print(f"   {name}: {want}-byte aligned")
    import zipfile
    z = zipfile.ZipFile(dst)
    bad = z.testzip()
    if bad:
        raise SystemExit(f"corrupt entry after alignment: {bad}")
    for info in z.infolist():
        gz = z.read(info.filename)
        assert len(gz) == info.file_size, info.filename
        assert zlib.crc32(gz) == info.CRC, info.filename
    print(f"verified {len(z.infolist())} entries, all CRCs ok")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
