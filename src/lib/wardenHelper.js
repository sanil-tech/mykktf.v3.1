import { base44 } from '@/api/base44Client';
import { isBlockInList, normalizeBlockCode } from '@/lib/kktfBlocks';

/**
 * Memastikan peranan yang aktif adalah Warden/Felo.
 * Apabila Super Admin berada dalam Mod Felo, role adalah 'warden'
 * dan tahap akses serta data WAJIB dihadkan mengikut peranan felo blok sahaja.
 */
export function isOperatingAsWarden(user) {
  if (!user) return false;
  const email = (user.email || user.real_email || '').toLowerCase();
  if (email === 'nurfadilahdarmansah@gmail.com' || user.role === 'principal' || user.effectiveRole === 'principal') {
    return false;
  }
  return user.role === 'warden' || user.effectiveRole === 'warden';
}

/**
 * Mengambil senarai blok rasmi jagaan felo / warden.
 * Menyemak entity WardenBlock dan menyokong penugasan berbilang blok (cth: Block C & Block E).
 */
export async function getWardenBlocks(user) {
  if (!user) return [];

  let blockNames = [];

  try {
    const allWb = await base44.entities.WardenBlock.list().catch(() => []);
    const userEmail = (user.email || user.real_email || '').toLowerCase();
    const userId = user.id;

    const myWb = (allWb || []).filter(w => {
      const matchesId = userId && w.warden_user_id === userId;
      const matchesEmail = w.warden_email && userEmail && w.warden_email.toLowerCase() === userEmail;
      const matchesName = user.full_name && w.warden_name && (
        user.full_name.toLowerCase().includes(w.warden_name.toLowerCase()) ||
        w.warden_name.toLowerCase().includes(user.full_name.toLowerCase())
      );
      return matchesId || matchesEmail || matchesName;
    });

    blockNames = myWb.map(w => w.block_name).filter(Boolean);
  } catch (err) {
    console.warn('Ralat getWardenBlocks:', err);
  }

  // Fallback: periksa active_warden_block dan localStorage jika rekod id/email belum sinkron
  if (blockNames.length === 0) {
    const rawPersona = user.active_warden_block || 
                       localStorage.getItem('mykktf_felo_assigned_block') || 
                       localStorage.getItem('mykktf_persona_block');
    if (rawPersona) {
      // Menangani format seperti "Block C & Block E" atau "Semua (Block C & Block E)"
      const cleaned = rawPersona
        .replace(/^Semua\s*\(?/i, '')
        .replace(/\)?$/i, '');
      blockNames = cleaned
        .split('&')
        .map(b => b.trim())
        .filter(Boolean);
    }
  }

  // Buang duplikasi
  const uniqueBlocks = Array.from(new Set(blockNames));
  return uniqueBlocks;
}
