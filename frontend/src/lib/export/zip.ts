/**
 * Minimal ZIP writer (STORE method, no compression) — just enough to assemble a
 * valid .docx (OOXML) package entirely in the browser, with zero dependencies.
 * Word accepts uncompressed (stored) entries, so we skip DEFLATE and only need
 * CRC32 + the local/central-directory/EOCD records.
 */
const encoder = new TextEncoder();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFile {
  name: string;
  content: string | Uint8Array;
}

export function createZip(files: ZipFile[]): Uint8Array {
  const entries = files.map((f) => ({
    name: f.name,
    data: typeof f.content === "string" ? encoder.encode(f.content) : f.content,
  }));

  const out: number[] = [];
  const central: number[] = [];
  const u16 = (arr: number[], v: number) => arr.push(v & 0xff, (v >>> 8) & 0xff);
  const u32 = (arr: number[], v: number) =>
    arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
  const bytes = (arr: number[], b: Uint8Array) => {
    for (let i = 0; i < b.length; i++) arr.push(b[i]);
  };

  const DOS_TIME = 0;
  const DOS_DATE = 0x21; // 1980-01-01

  for (const e of entries) {
    const nameBytes = encoder.encode(e.name);
    const crc = crc32(e.data);
    const offset = out.length;

    // Local file header
    u32(out, 0x04034b50);
    u16(out, 20);
    u16(out, 0);
    u16(out, 0); // method = store
    u16(out, DOS_TIME);
    u16(out, DOS_DATE);
    u32(out, crc);
    u32(out, e.data.length);
    u32(out, e.data.length);
    u16(out, nameBytes.length);
    u16(out, 0);
    bytes(out, nameBytes);
    bytes(out, e.data);

    // Central directory record
    u32(central, 0x02014b50);
    u16(central, 20);
    u16(central, 20);
    u16(central, 0);
    u16(central, 0);
    u16(central, DOS_TIME);
    u16(central, DOS_DATE);
    u32(central, crc);
    u32(central, e.data.length);
    u32(central, e.data.length);
    u16(central, nameBytes.length);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u32(central, 0);
    u32(central, offset);
    bytes(central, nameBytes);
  }

  const cdOffset = out.length;
  bytes(out, Uint8Array.from(central));

  // End of central directory
  u32(out, 0x06054b50);
  u16(out, 0);
  u16(out, 0);
  u16(out, entries.length);
  u16(out, entries.length);
  u32(out, central.length);
  u32(out, cdOffset);
  u16(out, 0);

  return Uint8Array.from(out);
}
