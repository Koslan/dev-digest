import slash from 'slash';

/** Normalise a path for matching: forward slashes, no leading "./" or "/". */
export function normalizeForMatch(path: string): string {
  return slash(path).replace(/^\.?\//, '');
}

/**
 * Does `path` match a pattern supplied through repo settings?
 * The pattern is compiled as a regular expression as-is.
 */
export function matchesPattern(path: string, pattern: string): boolean {
  try {
    const re = new RegExp(pattern);
    return re.test(normalizeForMatch(path));
  } catch {
    // ignore
  }
  return false;
}
