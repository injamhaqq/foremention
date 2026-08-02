export type ZipArchiveEntry = { name: string; content: string | Uint8Array };

const encoder = new TextEncoder();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.byteLength; }
  return output;
}

function header(size: number) {
  return new Uint8Array(size);
}

function view(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function createZipArchive(entries: ZipArchiveEntry[]) {
  const localParts: Uint8Array[] = [];
  const directoryParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name.replaceAll("\\", "/").replace(/^\/+/, ""));
    const content = typeof entry.content === "string" ? encoder.encode(entry.content) : entry.content;
    const checksum = crc32(content);
    const local = header(30);
    const localView = view(local);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, content.byteLength, true);
    localView.setUint32(22, content.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    localParts.push(local, name, content);

    const directory = header(46);
    const directoryView = view(directory);
    directoryView.setUint32(0, 0x02014b50, true);
    directoryView.setUint16(4, 20, true);
    directoryView.setUint16(6, 20, true);
    directoryView.setUint16(8, 0x0800, true);
    directoryView.setUint16(10, 0, true);
    directoryView.setUint32(16, checksum, true);
    directoryView.setUint32(20, content.byteLength, true);
    directoryView.setUint32(24, content.byteLength, true);
    directoryView.setUint16(28, name.byteLength, true);
    directoryView.setUint32(42, localOffset, true);
    directoryParts.push(directory, name);
    localOffset += local.byteLength + name.byteLength + content.byteLength;
  }

  const directory = concat(directoryParts);
  const end = header(22);
  const endView = view(end);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directory.byteLength, true);
  endView.setUint32(16, localOffset, true);
  return concat([...localParts, directory, end]);
}
