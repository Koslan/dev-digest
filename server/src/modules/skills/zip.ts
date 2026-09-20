import { inflateRawSync } from 'node:zlib';

/**
 * A deliberately tiny read-only ZIP reader.
 *
 * An imported archive is untrusted input, so this never writes to disk, never
 * shells out, and never walks entry names as paths. It lists what is inside and
 * inflates exactly ONE entry — the skill body — leaving scripts and binaries in
 * the archive untouched.
 *
 * Unsupported on purpose: ZIP64, encryption, and compression methods other
 * than stored/deflate. Those raise instead of being guessed at.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
/** ZIP allows a trailing comment of up to 64 KiB after the EOCD record. */
const MAX_COMMENT = 0xffff;
const EOCD_MIN_SIZE = 22;

const STORED = 0;
const DEFLATED = 8;

export interface ZipEntry {
  name: string;
  /** Uncompressed size as declared by the central directory. */
  size: number;
  compression: number;
  localHeaderOffset: number;
  compressedSize: number;
}

export class ZipFormatError extends Error {}

function findEndOfCentralDirectory(buf: Buffer): number {
  const start = Math.max(0, buf.length - (EOCD_MIN_SIZE + MAX_COMMENT));
  for (let i = buf.length - EOCD_MIN_SIZE; i >= start; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  throw new ZipFormatError('Not a ZIP archive: end-of-central-directory record not found');
}

/** Names and sizes of every entry, without inflating anything. */
export function listZipEntries(buf: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buf);
  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  if (offset === 0xffffffff) throw new ZipFormatError('ZIP64 archives are not supported');

  const entries: ZipEntry[] = [];
  for (let i = 0; i < entryCount; i += 1) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new ZipFormatError('Malformed ZIP: central directory entry expected');
    }
    const compression = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const size = buf.readUInt32LE(offset + 24);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');

    // Directory entries end with a slash and carry no content.
    if (!name.endsWith('/')) {
      entries.push({ name, size, compression, localHeaderOffset, compressedSize });
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Inflate one entry into memory. Nothing else in the archive is touched. */
export function readZipEntry(buf: Buffer, entry: ZipEntry): Buffer {
  const start = entry.localHeaderOffset;
  if (start + 30 > buf.length || buf.readUInt32LE(start) !== LOCAL_SIGNATURE) {
    throw new ZipFormatError(`Malformed ZIP: local header missing for ${entry.name}`);
  }
  const nameLength = buf.readUInt16LE(start + 26);
  const extraLength = buf.readUInt16LE(start + 28);
  const dataStart = start + 30 + nameLength + extraLength;
  const data = buf.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compression === STORED) return Buffer.from(data);
  if (entry.compression === DEFLATED) return inflateRawSync(data);
  throw new ZipFormatError(
    `Unsupported ZIP compression method ${entry.compression} for ${entry.name}`,
  );
}

/** A ZIP always starts with a local file header (or is an empty archive). */
export function looksLikeZip(buf: Buffer): boolean {
  return buf.length >= 4 && (buf.readUInt32LE(0) === LOCAL_SIGNATURE || buf.readUInt32LE(0) === EOCD_SIGNATURE);
}
