import { getCountries, getCountryCallingCode, CountryCode } from 'libphonenumber-js';

export interface CountryData {
  id: CountryCode;
  name: string;
  flag: string;
  dialCode: string;
}

// Fallback dictionary for essential countries if Intl.DisplayNames is not supported
const FALLBACK_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  IN: 'India',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  BR: 'Brazil',
  MX: 'Mexico',
  JP: 'Japan',
  CN: 'China',
  ZA: 'South Africa',
  NZ: 'New Zealand',
};

// Generate flag from ISO 3166-1 alpha-2 code
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Safe access to Intl.DisplayNames
let regionNames: Intl.DisplayNames | null = null;
try {
  if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  }
} catch (e) {
  // Ignore
}

// Generate the master list of countries at runtime based on libphonenumber-js capabilities
export const COUNTRIES: CountryData[] = getCountries().map((code) => {
  let name = code;
  try {
    if (regionNames) {
      name = regionNames.of(code) || FALLBACK_NAMES[code] || code;
    } else {
      name = FALLBACK_NAMES[code] || code;
    }
  } catch (e) {
    name = FALLBACK_NAMES[code] || code;
  }

  return {
    id: code,
    name,
    flag: getFlagEmoji(code),
    dialCode: `+${getCountryCallingCode(code)}`,
  };
}).sort((a, b) => a.name.localeCompare(b.name));

export const getCountryById = (id: string) => COUNTRIES.find(c => c.id === id);
export const getCountryByDialCode = (dialCode: string) => COUNTRIES.find(c => c.dialCode === dialCode);
