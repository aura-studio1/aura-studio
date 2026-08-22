// web/src/lib/patcher.ts

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts', 'mvex']);
const VISUAL = new Set(['avc1', 'hev1', 'hvc1', 'mp4v']);
const DROP_FROM_STBL = new Set(['sgpd']);

const COMPRESSOR_NAME = new Uint8Array(32);
const seiData = new Uint8Array([
    0x00, 0x00, 0x00, 0x20, // length = 32
    0x06, // SEI NAL unit type
    0x05, // user_data_unregistered
    0x10, // payload size = 16
    // 16 bytes uuid
    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
    0x80, // rbsp_trailing_bits
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 // padding
]);
const PHANTOM_UNIT = new Uint8Array([0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00]);
const PHANTOM_FACTOR = 10;
const SEI_PAYLOAD_SIZE = 760;
const FTYP = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32, 0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31]);

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

    size(): number {
        if (this.children === null) {
            return 8 + this.payload.length;
        }
        return 8 + this.children.reduce((acc, c) => acc + c.size(), 0);
    }

    serialize(): Uint8Array {
        let payload: Uint8Array;
        if (this.children === null) {
            payload = this.payload;
        } else {
            payload = concat(this.children.map(c => c.serialize()));
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

function entryChildren(buf: Uint8Array, start: number) {
    const boxes = [];
    let pos = start;
    const end = buf.length;
    while (pos < end - 7) {
        const size = u32(buf, pos);
        if (size < 8 || pos + size > end) break;
        const type = bytesToString(buf.subarray(pos + 4, pos + 8));
        boxes.push({ type, pos, size });
        pos += size;
    }
    return boxes;
}

function rebuildVisualEntry(payload: Uint8Array, averageBitrate: number): Uint8Array {
    const header = payload.subarray(0, 86);
    const newHeader = new Uint8Array(86);
    newHeader.set(header.subarray(0, 43), 0);
    newHeader[43] = COMPRESSOR_NAME.length;
    newHeader.set(COMPRESSOR_NAME, 44);
    newHeader.set(header.subarray(84, 86), 84);

    const colr = concat([p32(19), stringToBytes('colrnclx'), new Uint8Array([0, 1, 0, 1, 0, 1, 0])]);
    const maxBr = Math.floor(averageBitrate * 1.073);
    const btrt = concat([p32(20), stringToBytes('btrt'), p32(0), p32(maxBr), p32(averageBitrate)]);

    const childrenInfo = entryChildren(payload, 86);
    const types = new Set(childrenInfo.map(c => c.type));

    const parts = [];
    for (const c of childrenInfo) {
        if (c.type === 'colr') {
            parts.push(colr);
        } else if (c.type === 'btrt') {
            parts.push(btrt);
        } else {
            parts.push(payload.subarray(c.pos, c.pos + c.size));
            if (c.type === 'pasp' && !types.has('colr')) {
                parts.push(colr);
            }
        }
    }

    if (!types.has('btrt')) {
        parts.push(btrt);
    }

    const finalPayload = concat([newHeader.subarray(8), ...parts]);
    return concat([p32(8 + finalPayload.length), payload.subarray(4, 8), finalPayload]);
}

function patchStsd(stsd: Box, averageBitrate: number) {
    const entryCount = u32(stsd.payload, 4);
    const parts = [stsd.payload.subarray(0, 8)];
    let pos = 8;
    for (let i = 0; i < entryCount; i++) {
        const size = u32(stsd.payload, pos);
        const type = bytesToString(stsd.payload.subarray(pos + 4, pos + 8));
        let entry = stsd.payload.subarray(pos, pos + size);

        if (VISUAL.has(type)) {
            entry = rebuildVisualEntry(entry, averageBitrate);
        }
        parts.push(entry);
        pos += size;
    }
    parts.push(stsd.payload.subarray(pos));
    stsd.payload = concat(parts);
}

function fixHdlr(mdia: Box, hdlrName: string) {
    const hdlr = mdia.find('hdlr');
    if (hdlr) {
        hdlr.payload = concat([hdlr.payload.subarray(0, 24), stringToBytes(hdlrName), new Uint8Array([0])]);
    }
}

function sampleCountFromStts(stts: Box): number {
    const entryCount = u32(stts.payload, 4);
    let count = 0;
    for (let i = 0; i < entryCount; i++) {
        count += u32(stts.payload, 8 + i * 8);
    }
    return count;
}

function stszSizes(stsz: Box): number[] {
    const sampleSize = u32(stsz.payload, 4);
    const sampleCount = u32(stsz.payload, 8);
    if (sampleSize !== 0) {
        return Array(sampleCount).fill(sampleSize);
    }
    const sizes = [];
    for (let i = 0; i < sampleCount; i++) {
        sizes.push(u32(stsz.payload, 12 + i * 4));
    }
    return sizes;
}

function setStsz(stsz: Box, sizes: number[]) {
    const parts = [stsz.payload.subarray(0, 4), p32(0), p32(sizes.length)];
    for (const s of sizes) parts.push(p32(s));
    stsz.payload = concat(parts);
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

function addPhantom(stbl: Box): number {
    const stts = stbl.find('stts');
    const stsz = stbl.find('stsz');
    const stsc = stbl.find('stsc');
    const stco = stbl.find('stco');

    if (!stts || !stsz || !stsc || !stco) return 0;

    const audioSampleCount = sampleCountFromStts(stts);
    if (u32(stsz.payload, 4) !== 0) return 0;
    if (u32(stsz.payload, 8) !== audioSampleCount) return 0;

    const extraSamples = audioSampleCount * (PHANTOM_FACTOR - 1);
    const extraSizes = new Uint8Array(4 * extraSamples);
    for (let i = 0; i < extraSamples; i++) {
        extraSizes[i * 4 + 3] = 8;
    }

    stsz.payload = concat([
        stsz.payload.subarray(0, 8),
        p32(audioSampleCount * PHANTOM_FACTOR),
        stsz.payload.subarray(12),
        extraSizes
    ]);

    const stscEntryCount = u32(stsc.payload, 4);
    const stcoEntryCount = u32(stco.payload, 4);

    stsc.payload = concat([
        stsc.payload.subarray(0, 4),
        p32(stscEntryCount + 1),
        stsc.payload.subarray(8),
        p32(stcoEntryCount + 1),
        p32(extraSamples),
        p32(1)
    ]);

    const entries = stcoEntries(stco);
    entries.push(0);
    setStco(stco, entries);

    return extraSamples;
}

function appendSttsZero(stbl: Box, extra: number) {
    const stts = stbl.find('stts');
    if (!stts || extra <= 0) return;
    const entryCount = u32(stts.payload, 4);
    stts.payload = concat([
        stts.payload.subarray(0, 4),
        p32(entryCount + 1),
        stts.payload.subarray(8),
        p32(extra),
        p32(0)
    ]);
}

function mediaDuration(mdia: Box) {
    const mdhd = mdia.find('mdhd');
    if (!mdhd) return { timescale: 0, duration: 0 };
    const version = mdhd.payload[0];
    const offset = 4 + (version === 1 ? 16 : 8);
    const timescale = u32(mdhd.payload, offset);
    
    let duration = 0;
    if (version === 1) {
        const hi = u32(mdhd.payload, offset + 4);
        const lo = u32(mdhd.payload, offset + 8);
        duration = (hi * 0x100000000) + lo;
    } else {
        duration = u32(mdhd.payload, offset + 4);
    }
    return { timescale, duration };
}

function trackKind(trak: Box): string {
    const mdia = trak.find('mdia');
    const minf = mdia ? mdia.find('minf') : null;
    if (!minf) return '?';
    if (minf.find('vmhd')) return 'v';
    if (minf.find('smhd')) return 'a';
    return '?';
}

function nalLengthSize(stsd: Box): number {
    const payload = stsd.payload;
    const entryCount = u32(payload, 4);
    let pos = 8;
    for (let i = 0; i < entryCount; i++) {
        const size = u32(payload, pos);
        const type = bytesToString(payload.subarray(pos + 4, pos + 8));
        if (VISUAL.has(type)) {
            const entry = payload.subarray(pos, pos + size);
            const children = entryChildren(entry, 86);
            for (const c of children) {
                if (c.type === 'avcC' && c.size >= 13) {
                    return (entry[c.pos + 12] & 3) + 1;
                }
            }
        }
        pos += size;
    }
    return 4;
}

function buildSei(size: number): Uint8Array {
    const uuid = new Uint8Array([
        0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
        0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef
    ]);
    const payload = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        payload[i] = Math.floor(Math.random() * 254) + 1;
    }
    
    const totalPayloadSize = 16 + size;
    let rem = totalPayloadSize;
    const sizeBytes = [];
    while (rem >= 255) {
        sizeBytes.push(255);
        rem -= 255;
    }
    sizeBytes.push(rem);

    return concat([
        new Uint8Array([0x06, 0x05]),
        new Uint8Array(sizeBytes),
        uuid,
        payload,
        new Uint8Array([0x80])
    ]);
}

function insertSei(chunk: Uint8Array, nalLenSize: number, seiData: Uint8Array): Uint8Array | null {
    const parts = [];
    let pos = 0;
    let inserted = false;

    while (pos + nalLenSize <= chunk.length) {
        const nalLenBytes = chunk.subarray(pos, pos + nalLenSize);
        let nalLen = 0;
        for (let i = 0; i < nalLenSize; i++) {
            nalLen = (nalLen << 8) | nalLenBytes[i];
        }

        if (nalLen === 0 || pos + nalLenSize + nalLen > chunk.length) break;

        const nalType = chunk[pos + nalLenSize] & 0x1F;

        if (!inserted && nalType >= 1 && nalType <= 5) {
            const seiLen = seiData.length;
            const seiLenBuf = new Uint8Array(nalLenSize);
            let temp = seiLen;
            for (let i = nalLenSize - 1; i >= 0; i--) {
                seiLenBuf[i] = temp & 0xFF;
                temp >>= 8;
            }
            parts.push(seiLenBuf);
            parts.push(seiData);
            inserted = true;
        }

        parts.push(chunk.subarray(pos, pos + nalLenSize + nalLen));
        pos += nalLenSize + nalLen;
    }

    if (!inserted) return null;
    parts.push(chunk.subarray(pos));
    return concat(parts);
}

export function applyBinaryPatch(buf: Uint8Array): Uint8Array {
    const toplevel = topLevel(buf);
    const moovInfo = toplevel.find(b => b.type === 'moov');
    const mdatInfo = toplevel.find(b => b.type === 'mdat');

    if (!moovInfo || !mdatInfo) {
        throw new Error("Missing moov or mdat box");
    }

    const moovBuf = buf.subarray(moovInfo.pos, moovInfo.pos + moovInfo.size);
    const moov = new Box('moov', new Uint8Array(0), parse(moovBuf, 8, moovBuf.length));

    moov.filterChildren(new Set(['mvex']));

    const traks = moov.children!.filter(b => b.type === 'trak');
    const vtrak = traks.find(t => trackKind(t) === 'v');
    const atrak = traks.find(t => trackKind(t) === 'a');

    if (!vtrak || !atrak) {
        throw new Error("Missing video or audio track. Please upload a video with an audio track.");
    }

    fixHdlr(vtrak.find('mdia')!, 'VideoHandler');
    fixHdlr(atrak.find('mdia')!, 'SoundHandler');

    vtrak.find('mdia')!.find('minf')!.find('stbl')!.filterChildren(DROP_FROM_STBL);
    atrak.filterChildren(new Set(['edts']));

    const vmdia = vtrak.find('mdia')!;
    const vstbl = vmdia.find('minf')!.find('stbl')!;

    const durInfo = mediaDuration(vmdia);
    const sizes = stszSizes(vstbl.find('stsz')!);
    const totalSize = sizes.reduce((a, b) => a + b, 0);

    const averageBitrate = durInfo.duration ? Math.floor(totalSize * 8 * durInfo.timescale / durInfo.duration) : 0;
    patchStsd(vstbl.find('stsd')!, averageBitrate);

    let mdatPayload = buf.subarray(mdatInfo.pos + mdatInfo.headerSize, mdatInfo.pos + mdatInfo.size);
    let seiLength = 0;

    if (SEI_PAYLOAD_SIZE > 0) {
        const vstco = vstbl.find('stco')!;
        const vstsz = vstbl.find('stsz')!;
        const chunkOffsets = stcoEntries(vstco);
        const sampleSizes = stszSizes(vstsz);

        if (chunkOffsets.length > 0 && sampleSizes.length > 0) {
            const firstChunkOffset = chunkOffsets[0];
            const firstSampleSize = sampleSizes[0];
            const offsetInMdat = firstChunkOffset - (mdatInfo.pos + mdatInfo.headerSize);

            if (offsetInMdat >= 0 && offsetInMdat + firstSampleSize <= mdatPayload.length) {
                const nalLenSize = nalLengthSize(vstbl.find('stsd')!);
                const chunk = mdatPayload.subarray(offsetInMdat, offsetInMdat + firstSampleSize);
                const seiData = buildSei(SEI_PAYLOAD_SIZE);

                const newChunk = insertSei(chunk, nalLenSize, seiData);
                if (newChunk) {
                    seiLength = newChunk.length - firstSampleSize;
                    mdatPayload = concat([
                        mdatPayload.subarray(0, offsetInMdat),
                        newChunk,
                        mdatPayload.subarray(offsetInMdat + firstSampleSize)
                    ]);

                    sampleSizes[0] += seiLength;
                    setStsz(vstsz, sampleSizes);

                    for (const box of moov.walk()) {
                        if (box.type === 'stco') {
                            const entries = stcoEntries(box);
                            for (let i = 0; i < entries.length; i++) {
                                if (entries[i] > firstChunkOffset) {
                                    entries[i] += seiLength;
                                }
                            }
                            setStco(box, entries);
                        }
                    }
                }
            }
        }
    }

    if (seiLength === 0) {
        console.warn("Could not find place to insert SEI");
    }

    const astbl = atrak.find('mdia')!.find('minf')!.find('stbl')!;
    const extra = addPhantom(astbl);

    if (extra > 0) {
        appendSttsZero(astbl, extra);
    } else {
        console.warn("Could not add phantom samples");
    }

    let moovSerialized = moov.serialize();

    const baseSize = FTYP.length + moovSerialized.length + 8;
    const diff = baseSize - (mdatInfo.pos + mdatInfo.headerSize);
    const phantomOffset = baseSize + mdatPayload.length;

    for (const box of moov.walk()) {
        if (box.type === 'stco') {
            const entries = stcoEntries(box);
            for (let i = 0; i < entries.length; i++) {
                entries[i] += diff;
            }
            setStco(box, entries);
        }
    }

    let patchedElst = false;
    for (const box of moov.walk()) {
        if (!patchedElst && box.type === 'elst') {
            if (box.payload.length >= 8) {
                if (box.payload[0] === 0 && box.payload[1] === 0 && box.payload[2] === 0 && box.payload[3] === 0) {
                    box.payload.set(new Uint8Array([0x10, 0x00, 0x00, 0x01]), 4);
                    patchedElst = true;
                }
            }
        }
    }

    const astco = astbl.find('stco')!;
    const aEntries = stcoEntries(astco);
    aEntries[aEntries.length - 1] = phantomOffset;
    setStco(astco, aEntries);

    moovSerialized = moov.serialize();
    
    const phantomData = new Uint8Array(PHANTOM_UNIT.length * extra);
    for (let i = 0; i < extra; i++) {
        phantomData.set(PHANTOM_UNIT, i * PHANTOM_UNIT.length);
    }

    return concat([
        FTYP,
        moovSerialized,
        p32(mdatPayload.length + 8),
        stringToBytes('mdat'),
        mdatPayload,
        phantomData
    ]);
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
                    // 64-bit duration (approximate by doubling low 32 bits if high is 0)
                    const hi = u32(out, doff);
                    const lo = u32(out, doff + 4);
                    // Safe for most normal duration values
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
