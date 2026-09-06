/**
 * Kolej Kediaman Tun Fuad (KKTF) Residential Blocks Definition
 * Standard 14 residential blocks: Block A through Block N
 */

export const ALL_KKTF_BLOCKS = [
  'Block A',
  'Block B',
  'Block C',
  'Block D',
  'Block E',
  'Block F',
  'Block G',
  'Block H',
  'Block I',
  'Block J',
  'Block K',
  'Block L',
  'Block M',
  'Block N'
];

/**
 * Normalizes a block string for reliable comparisons
 * e.g., "Blok A", "Block A", "blok a", "A" -> "A"
 */
export function normalizeBlockCode(block) {
  if (!block || typeof block !== 'string') return '';
  return block.replace(/^(block|blok)\s+/i, '').trim().toUpperCase();
}

/**
 * Returns canonical display name "Block X"
 */
export function getCanonicalBlockName(block) {
  const code = normalizeBlockCode(block);
  return code ? `Block ${code}` : (block || '');
}

/**
 * Official Institutional Security PINs for Physical Block Posters
 * Replaces trivial block names with high-entropy institutional security PINs
 */
export const KKTF_BLOCK_SECURITY_PINS = {
  'A': 'KKTF-A8429',
  'B': 'KKTF-B7315',
  'C': 'KKTF-C6294',
  'D': 'KKTF-D5183',
  'E': 'KKTF-E4072',
  'F': 'KKTF-F3961',
  'G': 'KKTF-G2850',
  'H': 'KKTF-H1749',
  'I': 'KKTF-I9638',
  'J': 'KKTF-J8527',
  'K': 'KKTF-K7416',
  'L': 'KKTF-L6305',
  'M': 'KKTF-M5294',
  'N': 'KKTF-N4183'
};

/**
 * Returns the official Security PIN for a given block
 */
export function getBlockSecurityPin(block) {
  const code = normalizeBlockCode(block);
  return KKTF_BLOCK_SECURITY_PINS[code] || (code ? `KKTF-${code}9901` : 'KKTF-SEC-0000');
}

/**
 * Generates an institutional security verification token for QR URLs
 */
export function getBlockSecurityToken(block) {
  const code = normalizeBlockCode(block);
  const pin = getBlockSecurityPin(block);
  const numPart = pin.replace(/\D/g, '');
  return `KKTF_SEC_${code}_${numPart}`;
}

/**
 * Normalizes PIN for input comparison (removes dashes, spaces, lowercasing)
 */
function cleanPinInput(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\s\-_#:]/g, '').toUpperCase();
}

/**
 * Identifies which block a given Security PIN belongs to, if any
 */
export function getBlockBySecurityPin(inputPin) {
  const clean = cleanPinInput(inputPin);
  if (!clean) return null;

  for (const [code, pin] of Object.entries(KKTF_BLOCK_SECURITY_PINS)) {
    const cleanExpected = cleanPinInput(pin);
    const shortExpected = cleanPinInput(`${code}${pin.replace(/\D/g, '')}`);
    if (clean === cleanExpected || clean === shortExpected) {
      return `Block ${code}`;
    }
  }
  return null;
}

/**
 * Checks if user input is simply the plain block name (e.g. "A", "Block A", "Blok A")
 */
export function isTrivialBlockName(input) {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  const normalized = normalizeBlockCode(trimmed);
  // If it's a single letter or "Block X" / "Blok X" without digits
  if (/^(block\s+|blok\s+)?[a-n]$/i.test(trimmed)) return true;
  // If normalized is a valid 1-letter code and there are no security numbers
  if (normalized.length === 1 && !/\d/.test(trimmed)) return true;
  return false;
}

/**
 * Verifies if user input matches the official security PIN of the assigned block
 * Rejects simple block names with informative error message
 */
export function verifyBlockSecurityPin(inputCode, assignedBlock) {
  if (!inputCode || typeof inputCode !== 'string' || !inputCode.trim()) {
    return {
      valid: false,
      error: 'Sila masukkan Kod PIN Keselamatan daripada poster fizikal blok.'
    };
  }

  const trimmed = inputCode.trim();

  // Explicit rejection for trivial block name inputs
  if (isTrivialBlockName(trimmed)) {
    const expectedPin = assignedBlock ? getBlockSecurityPin(assignedBlock) : 'KKTF-XXXXX';
    return {
      valid: false,
      isTrivial: true,
      error: `Nama blok ringkas ("${trimmed}") tidak diterima! Sila masukkan Kod PIN Keselamatan lengkap yang tertera pada poster fizikal (cth: ${expectedPin}).`
    };
  }

  const expectedPin = assignedBlock ? getBlockSecurityPin(assignedBlock) : null;
  const cleanInput = cleanPinInput(trimmed);
  const detectedBlock = getBlockBySecurityPin(trimmed);

  if (expectedPin) {
    const cleanExpected = cleanPinInput(expectedPin);
    const shortExpected = cleanPinInput(`${normalizeBlockCode(assignedBlock)}${expectedPin.replace(/\D/g, '')}`);

    if (cleanInput === cleanExpected || cleanInput === shortExpected) {
      return {
        valid: true,
        canonicalBlock: getCanonicalBlockName(assignedBlock),
        pin: expectedPin
      };
    }
  }

  // If matched a PIN but for a DIFFERENT block
  if (detectedBlock && assignedBlock && !isSameBlock(detectedBlock, assignedBlock)) {
    return {
      valid: false,
      mismatchedBlock: detectedBlock,
      error: `❌ Kod PIN ini adalah untuk ${detectedBlock}! Anda berdaftar di ${getCanonicalBlockName(assignedBlock)}. Sila gunakan kod PIN daripada poster blok anda sendiri.`
    };
  }

  return {
    valid: false,
    error: '❌ Kod PIN Keselamatan tidak sah! Sila rujuk Kod PIN 8-aksara yang tertera pada poster fizikal di pintu masuk blok anda.'
  };
}

/**
 * Checks if two block references represent the same residential block
 */
export function isSameBlock(b1, b2) {
  if (!b1 || !b2) return false;
  return normalizeBlockCode(b1) === normalizeBlockCode(b2);
}

/**
 * Checks if a block is in a given list of blocks
 */
export function isBlockInList(block, list) {
  if (!block || !Array.isArray(list) || list.length === 0) return false;
  const target = normalizeBlockCode(block);
  return list.some(b => normalizeBlockCode(b) === target);
}

