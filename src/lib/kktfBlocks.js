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
