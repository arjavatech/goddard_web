export function validateFilloutFormIdOrUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Form link is required';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'Form link must be an http(s) URL';
      }
      return null;
    } catch {
      return 'Form link must be a valid URL';
    }
  }

  // Accept Fillout "form id"/slug like `parent_handbook` used as `https://goddard.fillout.com/{id}`
  // Minimum 5 chars to avoid accidental short inputs like "es".
  const slugPattern = /^[a-z0-9][a-z0-9_-]{4,99}$/i;
  if (!slugPattern.test(trimmed)) {
    return 'Form link must be a valid Fillout form ID (min 5 chars; letters/numbers/_/-) or a full URL';
  }

  return null;
}
