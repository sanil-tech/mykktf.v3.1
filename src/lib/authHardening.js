/**
 * Authentication Hardening & Password Policy Utilities for MyKKTF v3.1
 */

/**
 * Validate password strength
 * Rules: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Kata laluan diperlukan.' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Kata laluan mestilah sekurang-kurangnya 8 aksara.' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      message: 'Kata laluan mesti mengandungi kombinasi huruf besar, huruf kecil, nombor, dan sekurang-kurangnya satu aksara khas (!@#$%^&* dsb).',
    };
  }

  return { valid: true, message: 'Kata laluan kukuh.' };
}

/**
 * CLIENT-SIDE / APPLICATION-LEVEL RATE LIMITING HELPER (SIMULATION)
 * Note: This in-memory tracking provides client-side throttling during active sessions.
 * Authoritative production account lockout is managed by the underlying Base44 auth provider.
 */

// In-memory failed login tracker for rate-limiting simulation
const failedAttemptsMap = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function recordFailedLogin(email) {
  if (!email) return;
  const now = Date.now();
  const record = failedAttemptsMap.get(email) || { count: 0, lockedUntil: null };

  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
  failedAttemptsMap.set(email, record);
}

export function isAccountLocked(email) {
  if (!email) return false;
  const record = failedAttemptsMap.get(email);
  if (!record || !record.lockedUntil) return false;

  if (Date.now() < record.lockedUntil) {
    const remainingMins = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return { locked: true, remainingMinutes: remainingMins };
  }

  // Lockout expired
  failedAttemptsMap.delete(email);
  return { locked: false, remainingMinutes: 0 };
}

export function resetFailedLogin(email) {
  if (!email) return;
  failedAttemptsMap.delete(email);
}
