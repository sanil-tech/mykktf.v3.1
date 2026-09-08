import { base44 } from '../api/base44Client.js';
import { logAudit } from './audit.js';

export const CURRENT_PRIVACY_NOTICE_VERSION = 'v2026.1';

export const OFFICIAL_PRIVACY_NOTICE = {
  version: CURRENT_PRIVACY_NOTICE_VERSION,
  title: 'Notis Privasi & Perlindungan Data Peribadi MyKKTF',
  effective_date: '2026-09-01',
  summary: 'Notis ini menerangkan pemprosesan data peribadi anda bagi pengurusan kolej kediaman selaras dengan Akta Perlindungan Data Peribadi 2010 (Akta 709) dan amalan tadbir urus data Universiti Malaysia Sabah.',
  content_ms: `
Notis Perlindungan Data Peribadi ini dikeluarkan selaras dengan peruntukan Akta Perlindungan Data Peribadi 2010 (Akta 709) dan Akta Perlindungan Data Peribadi (Pindaan) 2024 bagi mentadbir perlindungan privasi residen Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah.

1. MAKLUMAT YANG DIKUMPUL
Sistem MyKKTF mengumpul data peribadi yang merangkumi:
- Maklumat Pengenalan: Nama penuh, nombor matrik, nombor kad pengenalan/pasport, tarikh lahir, jantina, bangsa, agama.
- Maklumat Hubungan: Alamat e-mel, nombor telefon peribadi, nombor telefon kecemasan dan waris.
- Maklumat Akademik & Kediaman: Fakulti, program pengajian, tahun pengajian, blok dan nombor bilik.
- Rekod Operasi & Disiplin: Rekod keluar/masuk kolej (leave), kehadiran program, rekod kebajikan dan demerit kolej.
- Rekod Kesihatan/Perubatan: Maklumat alahan atau ketidakupayaan fizikal (sekiranya dizahirkan bagi tujuan penempatan dan kebajikan khusus).

2. TUJUAN PENGUMPULAN DATA
Data anda diproses secara eksklusif bagi tujuan:
- Pengurusan penempatan dan pendaftaran bilik kolej kediaman.
- Pemantauan keselamatan, pengesahan keluar/masuk dan pengurusan kecemasan.
- Rekod kebajikan pelajar, bantuan makanan/kewangan dan sokongan kaunseling.
- Penguatkuasaan disiplin dan peraturan kolej kediaman.
- Pengiraan mata merit bagi kelayakan penginapan semester berikutnya.

3. KATEGORI PENGGUNA BERAUTORITI
Akses kepada data peribadi anda adalah terhad kepada pegawai yang diberi kuasa berasaskan prinsip 'Least Privilege':
- Pentadbiran Kolej & Pengetua: Pengurusan rasmi dan tadbir urus eksekutif.
- Felo / Warden: Kebajikan, keselamatan blok dan kelulusan permohonan keluar.
- Staf Pentadbiran: Pendaftaran bilik dan pengurusan kunci (Drop-Key).
- JAKMAS: Bantuan operasi terhad (TANPA akses kepada No. IC penuh, rekod disiplin, atau fail kebajikan sulit).

4. KESELAMATAN & PENYIMPANAN DATA
Data disimpan dalam infrastruktur selamat dengan kawalan penyulitan, log audit automatik bagi setiap akses data sensitif, dan sekatan eksport data.

5. HAK SUBJEK DATA
Anda berhak untuk:
- Mengakses dan menyemak data peribadi anda melalui modul 'Profil Saya'.
- Mengemukakan 'Permohonan Pembetulan Data' sekiranya terdapat maklumat yang tidak tepat.
- Mendapatkan penjelasan lanjut melalui saluran rasmi Pentadbiran Kolej Kediaman Tun Fuad atau Jabatan Digital UMS.
  `,
};

/**
 * Check if the current user has acknowledged the latest privacy notice version
 */
export async function checkPrivacyAcknowledgement(user) {
  if (!user || !user.id) return { acknowledged: true, requiredVersion: CURRENT_PRIVACY_NOTICE_VERSION };

  try {
    if (!base44?.entities?.PrivacyAcknowledgement) {
      return { acknowledged: true, requiredVersion: CURRENT_PRIVACY_NOTICE_VERSION };
    }

    const acknowledgements = await base44.entities.PrivacyAcknowledgement.filter({
      user_id: user.id,
      privacy_notice_version: CURRENT_PRIVACY_NOTICE_VERSION,
    });

    if (acknowledgements && acknowledgements.length > 0) {
      return {
        acknowledged: true,
        record: acknowledgements[0],
        requiredVersion: CURRENT_PRIVACY_NOTICE_VERSION,
      };
    }

    return {
      acknowledged: false,
      requiredVersion: CURRENT_PRIVACY_NOTICE_VERSION,
    };
  } catch (error) {
    console.error('Error checking privacy notice acknowledgement:', error);
    return { acknowledged: true, requiredVersion: CURRENT_PRIVACY_NOTICE_VERSION };
  }
}

/**
 * Record a user's acknowledgement of the privacy notice
 */
export async function recordPrivacyAcknowledgement(user, optionalConsents = {}) {
  if (!user) return false;

  try {
    const timestamp = new Date().toISOString();
    const ackRecord = {
      user_id: user.id,
      user_email: user.email,
      matric_number: user.matric_number || '',
      privacy_notice_version: CURRENT_PRIVACY_NOTICE_VERSION,
      acknowledged_at: timestamp,
      ip_address: 'CLIENT_BROWSER',
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 100) : 'Web App',
      optional_consent_marketing: !!optionalConsents.marketing,
      optional_consent_alumni_network: !!optionalConsents.alumni,
    };

    if (base44?.entities?.PrivacyAcknowledgement) {
      await base44.entities.PrivacyAcknowledgement.create(ackRecord);
    }

    // Log the event in AuditLog
    await logAudit({
      user,
      action: 'PRIVACY_NOTICE_ACKNOWLEDGED',
      action_type: 'SECURITY_EVENT',
      module: 'PrivacyGovernance',
      resource_type: 'PrivacyNotice',
      resource_id: CURRENT_PRIVACY_NOTICE_VERSION,
      result: 'SUCCESS',
      details: { version: CURRENT_PRIVACY_NOTICE_VERSION, optionalConsents },
    });

    return true;
  } catch (error) {
    console.error('Failed to record privacy acknowledgement:', error);
    return false;
  }
}
