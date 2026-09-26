/**
 * Skill import — parsing an upload into a preview.
 *
 * The contract this pins: an imported skill is untrusted text that will be
 * pasted into an agent's system prompt, so the parser reads exactly one file,
 * never executes anything, and reports what it ignored.
 */
import { describe, it, expect } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { SkillsService } from '../src/modules/skills/service.js';
import { AppError } from '../src/platform/errors.js';

/** The service's parser needs no database — the repository is never touched. */
const service = new SkillsService(null as never);

function upload(filename: string, content: string | Buffer) {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  return { filename, content_base64: buf.toString('base64') };
}

/** Build a minimal ZIP (deflate) in memory, so the test needs no fixture file. */
function zip(files: { name: string; content: string }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const raw = Buffer.from(file.content, 'utf8');
    const deflated = deflateRawSync(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt32LE(0, 14); // crc — not verified by the reader
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(Buffer.concat([local, name, deflated]));

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, name]));

    offset += 30 + name.length + deflated.length;
  }

  const localPart = Buffer.concat(locals);
  const centralPart = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralPart.length, 12);
  eocd.writeUInt32LE(localPart.length, 16);
  return Buffer.concat([localPart, centralPart, eocd]);
}

const SKILL_MD = `---
name: api-contract-breaking-change
description: ALWAYS invoke when a route signature changes.
type: convention
---

# Breaking changes

Removing a response field is a breaking change.
`;

describe('SkillsService.preview — markdown', () => {
  it('takes name, description and type from the frontmatter', () => {
    const preview = service.preview(upload('SKILL.md', SKILL_MD));
    expect(preview.name).toBe('api-contract-breaking-change');
    expect(preview.description).toBe('ALWAYS invoke when a route signature changes.');
    expect(preview.type).toBe('convention');
    expect(preview.body.startsWith('# Breaking changes')).toBe(true);
    expect(preview.body).not.toContain('---');
  });

  it('falls back to the first heading and paragraph when there is no frontmatter', () => {
    const preview = service.preview(upload('notes.md', '# Test rubric\n\nCheck the edge cases.\n'));
    expect(preview.name).toBe('Test rubric');
    expect(preview.description).toBe('Check the edge cases.');
    expect(preview.type).toBe('custom'); // unknown type never fails an import
    expect(preview.warnings.join(' ')).toMatch(/frontmatter/);
  });

  it('rejects an empty upload', () => {
    expect(() => service.preview(upload('empty.md', ''))).toThrow(AppError);
  });
});

describe('SkillsService.preview — archive', () => {
  it('picks SKILL.md and lists every other member as ignored', () => {
    const archive = zip([
      { name: 'my-skill/README.md', content: '# readme' },
      { name: 'my-skill/SKILL.md', content: SKILL_MD },
      { name: 'my-skill/scripts/install.sh', content: 'rm -rf /' },
    ]);

    const preview = service.preview(upload('my-skill.zip', archive));

    expect(preview.origin).toBe('my-skill/SKILL.md');
    expect(preview.name).toBe('api-contract-breaking-change');
    // The shell script is reported, never read into the skill body.
    expect(preview.ignored).toEqual(
      expect.arrayContaining(['my-skill/README.md', 'my-skill/scripts/install.sh']),
    );
    expect(preview.body).not.toContain('rm -rf');
    expect(preview.warnings.join(' ')).toMatch(/ignored and never executed/);
  });

  it('falls back to any markdown file when the archive has no SKILL.md', () => {
    const archive = zip([{ name: 'pack/rules.md', content: '# Rules\n\nBe specific.\n' }]);
    const preview = service.preview(upload('pack.zip', archive));
    expect(preview.origin).toBe('pack/rules.md');
    expect(preview.warnings.join(' ')).toMatch(/No SKILL.md/);
  });

  it('refuses an archive with no markdown at all', () => {
    const archive = zip([{ name: 'pack/run.sh', content: 'echo hi' }]);
    expect(() => service.preview(upload('pack.zip', archive))).toThrow(/no SKILL.md/i);
  });
});
