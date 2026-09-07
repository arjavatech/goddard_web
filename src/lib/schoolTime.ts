/**
 * Audit timestamps are returned by the API as a school-local wall-clock value
 * (YYYY-MM-DDTHH:mm:ss) with no offset. Do not pass these values to `new Date`
 * because browsers would reinterpret them in the viewer's device timezone.
 */
export const SCHOOL_TIMEZONES = [
  ['EST', 'Eastern Time (EST/EDT)'], ['CST', 'Central Time (CST/CDT)'],
  ['MST', 'Mountain Time (MST/MDT)'], ['PST', 'Pacific Time (PST/PDT)'],
  ['AKST', 'Alaska Time (AKST/AKDT)'], ['HST', 'Hawaii Time (HST)'],
  ['IST', 'India Standard Time (IST)'], ['GMT', 'United Kingdom Time (GMT/BST)'],
  ['CET', 'Central European Time (CET/CEST)'], ['EET', 'Eastern European Time (EET/EEST)'],
  ['GST', 'Gulf Standard Time (GST)'], ['PKT', 'Pakistan Standard Time (PKT)'],
  ['BST', 'Bangladesh Standard Time (BST)'], ['ICT', 'Indochina Time (ICT)'],
  ['CST_CN', 'China Standard Time (CST)'], ['JST', 'Japan Standard Time (JST)'],
  ['KST', 'Korea Standard Time (KST)'], ['WIB', 'Western Indonesia Time (WIB)'],
  ['WITA', 'Central Indonesia Time (WITA)'], ['WIT', 'Eastern Indonesia Time (WIT)'],
  ['AEST', 'Eastern Australia Time (AEST/AEDT)'], ['ACST', 'Central Australia Time (ACST/ACDT)'],
  ['AWST', 'Western Australia Time (AWST)'], ['NZST', 'New Zealand Time (NZST/NZDT)'],
  ['BRT', 'Brazil Time (BRT)'], ['ART', 'Argentina Time (ART)'], ['CLT', 'Chile Time (CLT/CLST)'],
  ['SAST', 'South Africa Standard Time (SAST)'], ['EAT', 'East Africa Time (EAT)'],
  ['WAT', 'West Africa Time (WAT)'],
] as const;

export type SchoolTimezoneCode = typeof SCHOOL_TIMEZONES[number][0];

export const SCHOOL_TIMEZONE_REGIONS: Record<SchoolTimezoneCode, string> = {
  EST: 'America/New_York', CST: 'America/Chicago', MST: 'America/Denver', PST: 'America/Los_Angeles',
  AKST: 'America/Anchorage', HST: 'Pacific/Honolulu', IST: 'Asia/Kolkata', GMT: 'Europe/London',
  CET: 'Europe/Berlin', EET: 'Europe/Helsinki', GST: 'Asia/Dubai', PKT: 'Asia/Karachi', BST: 'Asia/Dhaka',
  ICT: 'Asia/Bangkok', CST_CN: 'Asia/Shanghai', JST: 'Asia/Tokyo', KST: 'Asia/Seoul', WIB: 'Asia/Jakarta',
  WITA: 'Asia/Makassar', WIT: 'Asia/Jayapura', AEST: 'Australia/Sydney', ACST: 'Australia/Adelaide',
  AWST: 'Australia/Perth', NZST: 'Pacific/Auckland', BRT: 'America/Sao_Paulo',
  ART: 'America/Argentina/Buenos_Aires', CLT: 'America/Santiago', SAST: 'Africa/Johannesburg',
  EAT: 'Africa/Nairobi', WAT: 'Africa/Lagos',
};

const LEGACY_TIMEZONE_CODES: Record<string, SchoolTimezoneCode> = {
  'America/New_York': 'EST', 'America/Chicago': 'CST', 'America/Denver': 'MST',
  'America/Los_Angeles': 'PST', 'Asia/Kolkata': 'IST',
};

export const normalizeSchoolTimezone = (value?: string): SchoolTimezoneCode => {
  if (value && value in SCHOOL_TIMEZONE_REGIONS) return value as SchoolTimezoneCode;
  return LEGACY_TIMEZONE_CODES[value || ''] || 'EST';
};

export const schoolTimezoneLabel = (code?: string) =>
  SCHOOL_TIMEZONES.find(([value]) => value === normalizeSchoolTimezone(code))?.[1] || 'School time';

const localParts = (value?: string) => {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match;
  return { year, month, day, hour, minute };
};

export const formatSchoolDateTime = (value?: string) => {
  const parts = localParts(value);
  if (!parts) return value || '—';
  const hour = Number(parts.hour);
  return `${Number(parts.month)}/${Number(parts.day)}/${parts.year}, ${hour % 12 || 12}:${parts.minute} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export const formatSchoolTime = (value?: string) => {
  const parts = localParts(value);
  if (!parts) return value || '—';
  const hour = Number(parts.hour);
  return `${hour % 12 || 12}:${parts.minute} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export const schoolLocalDateFromTimestamp = (value?: string) => localParts(value)
  ? `${localParts(value)!.year}-${localParts(value)!.month}-${localParts(value)!.day}`
  : '';

export const schoolToday = (code?: string) => {
  const timezone = SCHOOL_TIMEZONE_REGIONS[normalizeSchoolTimezone(code)];
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};
