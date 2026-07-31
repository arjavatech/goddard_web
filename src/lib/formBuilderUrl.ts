const FORM_BUILDER_DOMAIN = 'form-builder-atj.pages.dev';

/** Matches the form-builder host and any tenant-specific subdomain. */
export function isFormBuilderUrl(value: string | null | undefined): boolean {
  if (!value) return false;

  try {
    const { hostname } = new URL(value);
    return hostname === FORM_BUILDER_DOMAIN || hostname.endsWith(`.${FORM_BUILDER_DOMAIN}`);
  } catch {
    return false;
  }
}

export function getFormBuilderOrigin(value: string | null | undefined): string | null {
  if (!isFormBuilderUrl(value)) return null;

  try {
    return new URL(value ?? '').origin;
  } catch {
    return null;
  }
}
