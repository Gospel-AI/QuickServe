// Ghana phone number utilities

const GHANA_COUNTRY_CODE = '+233';

// MTN: 024, 054, 055, 059
// Vodafone: 020, 050
// AirtelTigo: 026, 027, 057
const VALID_PREFIXES = ['20', '24', '26', '27', '50', '54', '55', '57', '59'];

/**
 * Normalize Ghana phone number to international format
 * Examples:
 *   0241234567 -> +233241234567
 *   233241234567 -> +233241234567
 *   +233241234567 -> +233241234567
 */
export function normalizeGhanaPhone(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Remove leading 233 if present
  if (cleaned.startsWith('233')) {
    cleaned = cleaned.substring(3);
  }

  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Should now be 9 digits (e.g., 241234567)
  if (cleaned.length !== 9) {
    throw new Error('Invalid phone number format');
  }

  return GHANA_COUNTRY_CODE + cleaned;
}

/**
 * Validate Ghana phone number
 */
export function isValidGhanaPhone(phone: string): boolean {
  try {
    const normalized = normalizeGhanaPhone(phone);
    const withoutCountryCode = normalized.substring(4); // Remove +233
    const prefix = withoutCountryCode.substring(0, 2);
    return VALID_PREFIXES.includes(prefix);
  } catch {
    return false;
  }
}

/**
 * Get carrier from phone number
 */
export function getCarrier(phone: string): 'MTN' | 'Vodafone' | 'AirtelTigo' | 'Unknown' {
  try {
    const normalized = normalizeGhanaPhone(phone);
    const prefix = normalized.substring(4, 6);

    if (['24', '54', '55', '59'].includes(prefix)) return 'MTN';
    if (['20', '50'].includes(prefix)) return 'Vodafone';
    if (['26', '27', '57'].includes(prefix)) return 'AirtelTigo';

    return 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * Format phone for display (e.g., +233 24 123 4567)
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizeGhanaPhone(phone);
  const digits = normalized.substring(4);
  return `${GHANA_COUNTRY_CODE} ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
}
