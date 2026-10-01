// web/src/lib/patcher.ts
// Updated to match AlterEditingMethod v1.5.6

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts', 'mvex']);

// v1.5.6: mvhd duration is set to maximum value (0xFFFFFFFFFFFFFFFF)
const MVHD_MAX_DURATION_HI = 0xFFFFFFFF;
const MVHD_MAX_DURATION_LO = 0xFFFFFFFF;

function u32(buf: Uint8Array, offset: number): number {
    return (buf[offset] << 24) | (buf[offset+1] << 16) | (buf[offset+2] << 8) | buf[offset+3];
}

function p32(val: number): Uint8Array {
    const b = new Uint8Array(4);
    b[0] = (val >> 24) & 0xff;
    b[1] = (val >> 16) & 0xff;
    b[2] = (val >> 8) & 0xff;
    b[3] = val & 0xff;
    return b;
}

function p64(hi: number, lo: number): Uint8Array {
    return concat([p32(hi), p32(lo)]);
}

function concat(bufs: Uint8Array[]): Uint8Array {
    const total = bufs.reduce((acc, b) => acc + b.length, 0);
    const res = new Uint8Array(total);
    let offset = 0;
    for (const b of bufs) {
        res.set(b, offset);
        offset += b.length;
    }
    return res;
}

function stringToBytes(str: string): Uint8Array {
    const res = new Uint8Array(str.length);
    for(let i = 0; i < str.length; i++) res[i] = str.charCodeAt(i);
    return res;
}

function bytesToString(buf: Uint8Array): string {
    let res = '';
    for(let i = 0; i < buf.length; i++) res += String.fromCharCode(buf[i]);
    return res;
}

class Box {
    type: string;
    payload: Uint8Array;
    children: Box[] | null;

    constructor(type: string, payload: Uint8Array = new Uint8Array(0), children: Box[] | null = null) {
        this.type = type;
        this.payload = payload;
        this.children = children;
    }

    serialize(): Uint8Array {
        let payload: Uint8Array;
        if (this.children === null) {
            payload = this.payload;
        } else {
            payload = concat(this.children.map(c => c.serialize()));
        }
        if (payload.length > 0xFFFFFFFF - 8) {
            throw new Error('Box too large: ' + this.type);
        }
        return concat([p32(8 + payload.length), stringToBytes(this.type), payload]);
    }

    find(type: string): Box | null {
        if (this.children === null) return null;
        for (const c of this.children) {
            if (c.type === type) return c;
        }
        return null;
    }

    filterChildren(dropTypes: Set<string>) {
        if (this.children !== null) {
            this.children = this.children.filter(c => !dropTypes.has(c.type));
        }
    }

    *walk(): IterableIterator<Box> {
        yield this;
        if (this.children) {
            for (const c of this.children) {
                yield* c.walk();
            }
        }
    }
}

function parse(buf: Uint8Array, start: number, end: number): Box[] {
    const boxes: Box[] = [];
    let pos = start;
    while (pos < end - 7) {
        let size = u32(buf, pos);
        const type = bytesToString(buf.subarray(pos + 4, pos + 8));
        let headerSize = 8;

        if (size === 1) {
            const hi = u32(buf, pos + 8);
            const lo = u32(buf, pos + 12);
            size = (hi * 0x100000000) + lo;
            headerSize = 16;
        } else if (size === 0) {
            size = end - pos;
        }

        if (size < headerSize || pos + size > end) break;

        if (CONTAINERS.has(type)) {
            boxes.push(new Box(type, new Uint8Array(0), parse(buf, pos + headerSize, pos + size)));
        } else {
            boxes.push(new Box(type, buf.subarray(pos + headerSize, pos + size)));
        }
        pos += size;
    }
    return boxes;
}

function topLevel(buf: Uint8Array) {
    const boxes = [];
    let pos = 0;
    const end = buf.length;
    while (pos < end - 7) {
        let size = u32(buf, pos);
        const type = bytesToString(buf.subarray(pos + 4, pos + 8));
        let headerSize = 8;
        if (size === 1) {
            const hi = u32(buf, pos + 8);
            const lo = u32(buf, pos + 12);
            size = (hi * 0x100000000) + lo;
            headerSize = 16;
        } else if (size === 0) {
            size = end - pos;
        }
        if (size < headerSize || pos + size > end) break;

        boxes.push({ type, pos, size, headerSize });
        pos += size;
    }
    return boxes;
}

function stcoEntries(stco: Box): number[] {
    const entryCount = u32(stco.payload, 4);
    const entries = [];
    for (let i = 0; i < entryCount; i++) {
        entries.push(u32(stco.payload, 8 + i * 4));
    }
    return entries;
}

function setStco(stco: Box, entries: number[]) {
    const parts = [stco.payload.subarray(0, 4), p32(entries.length)];
    for (const e of entries) parts.push(p32(e));
    stco.payload = concat(parts);
}

/**
 * v1.5.6 Binary Patch: Force mvhd to version 1 with maximum duration.
 * 
 * This approach works by:
 * 1. Keeping the original ftyp box
 * 2. Parsing and modifying the moov box (drop mvex, force mvhd max duration)
 * 3. Recalculating stco offsets for the new moov size
 * 4. Outputting: ftyp + modified moov + original mdat
 */
export function applyBinaryPatch(buf: Uint8Array): Uint8Array {
    const toplevel = topLevel(buf);
    const ftypInfo = toplevel.find(b => b.type === 'ftyp');
    const moovInfo = toplevel.find(b => b.type === 'moov');
    const mdatInfo = toplevel.find(b => b.type === 'mdat');

    if (!ftypInfo || !moovInfo || !mdatInfo) {
        throw new Error("Missing ftyp, moov or mdat box");
    }

    // Check not fragmented (only 1 mdat allowed)
    if (toplevel.filter(b => b.type === 'mdat').length !== 1) {
        throw new Error("Fragmented MP4 not supported");
    }

    // Keep original ftyp
    const ftypBuf = buf.subarray(ftypInfo.pos, ftypInfo.pos + ftypInfo.size);

    // Keep original mdat (including its box header)
    const mdatBuf = buf.subarray(mdatInfo.pos, mdatInfo.pos + mdatInfo.size);

    // Where mdat data starts in the original file
    const mdatDataStart = mdatInfo.pos + mdatInfo.headerSize;

    // Parse moov into editable tree
    const moov = new Box('moov', new Uint8Array(0),
        parse(buf, moovInfo.pos + moovInfo.headerSize, moovInfo.pos + moovInfo.size));

    // Drop mvex (used for fragmented MP4, not needed)
    moov.filterChildren(new Set(['mvex']));

    // === Force mvhd to version 1 with max duration ===
    const mvhd = moov.find('mvhd');
    if (!mvhd) throw new Error("mvhd not found");

    const mvhdPayload = mvhd.payload;
    const mvhdVersion = mvhdPayload[0];

    if (mvhdVersion === 0) {
        // Convert mvhd from version 0 (32-bit) to version 1 (64-bit)
        // v0 layout: [ver(1)+flags(3)] [create(4)] [modify(4)] [timescale(4)] [duration(4)] [rest...]
        // v1 layout: [ver(1)+flags(3)] [create(8)] [modify(8)] [timescale(4)] [duration(8)] [rest...]
        const timescale = u32(mvhdPayload, 12);
        const rest = mvhdPayload.subarray(20); // everything after duration in v0
        mvhd.payload = concat([
            new Uint8Array([1, 0, 0, 0]),                      // version 1, flags 0
            p64(0, 0),                                          // creation_time = 0
            p64(0, 0),                                          // modification_time = 0
            p32(timescale),                                     // timescale (unchanged)
            p64(MVHD_MAX_DURATION_HI, MVHD_MAX_DURATION_LO),  // duration = max
            rest                                                // rate, volume, matrix, next_track_id...
        ]);
    } else {
        // Already version 1, just zero timestamps and set max duration
        const newPayload = new Uint8Array(mvhdPayload);
        // Zero creation_time (bytes 4-11)
        newPayload.set(p64(0, 0), 4);
        // Zero modification_time (bytes 12-19)
        newPayload.set(p64(0, 0), 12);
        // Set duration to max (bytes 24-31)
        newPayload.set(p64(MVHD_MAX_DURATION_HI, MVHD_MAX_DURATION_LO), 24);
        mvhd.payload = newPayload;
    }

    // First serialize to calculate the new moov size and offset shift
    const moovSerialized1 = moov.serialize();
    // In the output file: ftyp + moov + mdat
    // mdat data will start at: ftypSize + moovSize + mdatHeaderSize
    const newMdatDataStart = ftypBuf.length + moovSerialized1.length + mdatInfo.headerSize;
    const shift = newMdatDataStart - mdatDataStart;

    // Adjust all stco (chunk offset) entries by the shift amount
    if (shift !== 0) {
        for (const box of moov.walk()) {
            if (box.type === 'stco') {
                setStco(box, stcoEntries(box).map(e => e + shift));
            }
        }
    }

    // Re-serialize moov with corrected offsets
    const moovSerialized2 = moov.serialize();

    // Output: original ftyp + modified moov + original mdat
    return concat([ftypBuf, moovSerialized2, mdatBuf]);
}

export function applySmoothFpsPatch(buf: Uint8Array): Uint8Array {
    // We can modify the buffer in-place since sizes don't change
    const out = new Uint8Array(buf);
    
    function processBox(start: number, end: number) {
        let pos = start;
        while (pos < end - 7) {
            let size = u32(out, pos);
            const type = bytesToString(out.subarray(pos + 4, pos + 8));
            let headerSize = 8;
            if (size === 1) {
                const hi = u32(out, pos + 8);
                const lo = u32(out, pos + 12);
                size = (hi * 0x100000000) + lo;
                headerSize = 16;
            } else if (size === 0) {
                size = end - pos;
            }
            if (size < headerSize || pos + size > end) break;
            
            if (CONTAINERS.has(type)) {
                processBox(pos + headerSize, pos + size);
            } else if (type === 'mvhd') {
                const version = out[pos + headerSize];
                const doff = pos + headerSize + (version === 1 ? 24 : 16);
                if (version === 1) {
                    const hi = u32(out, doff);
                    const lo = u32(out, doff + 4);
                    const val = (hi * 0x100000000) + lo;
                    const doubled = val * 2;
                    out.set(p32(Math.floor(doubled / 0x100000000)), doff);
                    out.set(p32(doubled % 0x100000000), doff + 4);
                } else {
                    out.set(p32(u32(out, doff) * 2), doff);
                }
            } else if (type === 'tkhd') {
                const version = out[pos + headerSize];
                const doff = pos + headerSize + (version === 1 ? 28 : 20);
                if (version === 1) {
                    const hi = u32(out, doff);
                    const lo = u32(out, doff + 4);
                    const val = (hi * 0x100000000) + lo;
                    const doubled = val * 2;
                    out.set(p32(Math.floor(doubled / 0x100000000)), doff);
                    out.set(p32(doubled % 0x100000000), doff + 4);
                } else {
                    out.set(p32(u32(out, doff) * 2), doff);
                }
            } else if (type === 'mdhd') {
                const version = out[pos + headerSize];
                const doff = pos + headerSize + (version === 1 ? 24 : 16);
                if (version === 1) {
                    const hi = u32(out, doff);
                    const lo = u32(out, doff + 4);
                    const val = (hi * 0x100000000) + lo;
                    const doubled = val * 2;
                    out.set(p32(Math.floor(doubled / 0x100000000)), doff);
                    out.set(p32(doubled % 0x100000000), doff + 4);
                } else {
                    out.set(p32(u32(out, doff) * 2), doff);
                }
            } else if (type === 'elst') {
                const version = out[pos + headerSize];
                const cnt = u32(out, pos + headerSize + 4);
                let eoff = pos + headerSize + 8;
                for (let i = 0; i < cnt; i++) {
                    if (version === 1) {
                        const hi = u32(out, eoff);
                        const lo = u32(out, eoff + 4);
                        const val = (hi * 0x100000000) + lo;
                        const doubled = val * 2;
                        out.set(p32(Math.floor(doubled / 0x100000000)), eoff);
                        out.set(p32(doubled % 0x100000000), eoff + 4);
                        eoff += 20;
                    } else {
                        out.set(p32(u32(out, eoff) * 2), eoff);
                        eoff += 12;
                    }
                }
            } else if (type === 'stts') {
                const cnt = u32(out, pos + headerSize + 4);
                let eoff = pos + headerSize + 8;
                for (let i = 0; i < cnt; i++) {
                    out.set(p32(u32(out, eoff + 4) * 2), eoff + 4);
                    eoff += 8;
                }
            } else if (type === 'ctts') {
                const cnt = u32(out, pos + headerSize + 4);
                let eoff = pos + headerSize + 8;
                for (let i = 0; i < cnt; i++) {
                    out.set(p32(u32(out, eoff + 4) * 2), eoff + 4);
                    eoff += 8;
                }
            }
            
            pos += size;
        }
    }
    
    processBox(0, out.length);
    return out;
}
