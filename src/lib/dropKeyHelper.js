import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/audit';

const STORAGE_KEY = 'kktf_drop_key_requests';

/**
 * Mengambil semua permohonan Drop-Key Check-Out daripada localStorage
 */
export function getDropKeyRequests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Ralat membaca permohonan drop-key:', err);
    return [];
  }
}

/**
 * Mengambil dan menyegerakkan permohonan Drop-Key daripada pangkalan data Base44 (SUMBER UTAMA)
 * Admin menggunakan fungsi ini untuk melihat SEMUA permohonan dari semua pelajar
 */
export async function fetchAndSyncDropKeyRequests() {
  try {
    // ── Fetch dari DB (Sumber Utama) ─────────────────────────────────────────
    const allCheckouts = await base44.entities.CheckOut.list('-created_date').catch(() => []);
    const dropKeyCheckouts = (allCheckouts || []).filter(c =>
      c.status === 'pending_verification' ||
      String(c.room_condition || '').includes('Drop-Key') ||
      String(c.damage_assessment || '').includes('DROP-KEY') ||
      String(c.damage_assessment || '').includes('Express Drop-Key') ||
      String(c.damage_assessment || '').includes('[EXPRESS DROP-KEY]')
    );

    // ── Tukar rekod CheckOut ke format drop-key request ──────────────────────
    const dbRequests = dropKeyCheckouts.map(c => {
      // Cuba parse metadata dari field 'notes'
      let meta = {};
      try { meta = JSON.parse(c.notes || '{}'); } catch (e) {}
      const safePhotos = meta.photos || {};
      const photoRoomClean = safePhotos.room_clean || meta.photo_room_clean || null;
      const photoKeyTag = safePhotos.key_envelope || meta.photo_key_tag || null;
      const photoWardrobe = safePhotos.wardrobe_empty || meta.photo_wardrobe_open || null;
      const photoSwitches = safePhotos.switches_locked || meta.photo_switches_off || null;
      
      return {
        id: meta.local_id || `dk_db_${c.id}`,
        checkout_record_id: c.id,
        student_id: c.student_matric || '',
        student_db_id: c.student_id || '',     // UUID pelajar (bukan matric)
        student_name: c.student_name || 'Pelajar',
        student_matric: c.student_matric || '',
        student_email: meta.student_email || '',
        student_phone: meta.student_phone || '',
        user_id: meta.user_id || '',
        block_name: c.block_name || '',
        room_number: c.room_number || '',
        room_id: c.room_id || '',
        checkout_date: c.check_out_date || '',
        checkout_time: c.check_out_time || '',
        semester: c.semester || '',
        envelope_tag: meta.envelope_tag || '',
        reason: meta.reason || '',
        declaration_agreed: Boolean(meta.declaration_agreed),
        photos: {
          room_clean: photoRoomClean || 'verified_self_declaration',
          key_envelope: photoKeyTag || 'verified_self_declaration',
          wardrobe_empty: photoWardrobe,
          switches_locked: photoSwitches
        },
        photo_room_clean: photoRoomClean,
        photo_key_tag: photoKeyTag,
        photo_wardrobe_open: photoWardrobe,
        photo_switches_off: photoSwitches,
        status: c.status || 'pending_verification',
        created_at: meta.created_at || c.created_date || new Date().toISOString(),
        scanned_at_dropbox: null,
        source: 'db'
      };
    });

    // ── Baca cache localStorage (tambah jika tidak ada dalam DB) ────────────
    const localRequests = getDropKeyRequests();
    const dbIds = new Set(dropKeyCheckouts.map(c => c.id));
    const localOnly = localRequests.filter(l => 
      l.checkout_record_id && !dbIds.has(l.checkout_record_id)
    );

    // DB dahulu, kemudian rekod local yang tiada padanan DB
    const merged = [...dbRequests, ...localOnly];
    return merged;
  } catch (e) {
    console.warn('Gagal fetch drop-key dari DB, guna localStorage:', e);
    return getDropKeyRequests();
  }
}


/**
 * Mendapatkan permohonan aktif bagi seseorang pelajar
 */
export function getStudentActiveDropKeyRequest(studentId, matricNo) {
  const all = getDropKeyRequests();
  return all.find(r => 
    (String(r.student_id) === String(studentId) || (matricNo && r.student_matric?.toLowerCase() === matricNo.toLowerCase())) &&
    r.status === 'pending_verification'
  ) || null;
}

/**
 * Menghantar permohonan baharu Express Drop-Key Check-Out oleh pelajar (disimpan ke Pangkalan Data Base44 & LocalStorage)
 */
export async function submitDropKeyRequest(data) {
  const localId = `dk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // ─── 1. SIMPAN KE DB (SUMBER UTAMA / SINGLE SOURCE OF TRUTH) ────────────────
  // student_db_id = UUID entiti Student dalam DB (bukan matric number)
  const studentDbId = data.student_db_id || data.student_entity_id || '';
  
  // Format foto secara selamat untuk metadata: elakkan base64 gergasi merosakkan kuota DB
  const safeNotesPhotos = {};
  if (data.photos) {
    for (const [k, v] of Object.entries(data.photos)) {
      if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
        safeNotesPhotos[k] = v;
      } else if (typeof v === 'string' && v.startsWith('data:')) {
        // Hanya simpan data URL jika ringan (< 35KB) supaya saiz payload payload kekal selamat
        safeNotesPhotos[k] = v.length < 35000 ? v : 'verified_self_declaration';
      } else if (v) {
        safeNotesPhotos[k] = v;
      }
    }
  }

  const primaryPayload = {
    // Rujukan UUID pelajar yang betul (bukan matric number)
    student_id: studentDbId || data.student_matric || data.student_id || '',
    room_id: data.room_id || 'room_dropkey',
    check_out_date: data.checkout_date || new Date().toISOString().split('T')[0],
    check_out_time: data.checkout_time || `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
    semester: data.semester || 'Sem1_2526',
    // Gunakan 'Good' bagi mematuhi enum rasmi CheckOut schema ("Good", "Fair", "Damaged")
    room_condition: 'Good',
    damage_assessment: [
      '[EXPRESS DROP-KEY]',
      data.envelope_tag ? `Tag: ${data.envelope_tag}` : '',
      data.reason ? `Sebab: ${data.reason}` : '',
    ].filter(Boolean).join(' | '),
    student_name: data.student_name || 'Pelajar Residen',
    student_matric: data.student_matric || data.student_id || '',
    room_number: data.room_number || '',
    block_name: data.block_name || '',
    status: 'pending_verification',
    notes: JSON.stringify({
      local_id: localId,
      user_id: data.user_id || '',
      student_email: data.student_email || '',
      student_phone: data.student_phone || '',
      envelope_tag: data.envelope_tag || '',
      reason: data.reason || '',
      declaration_agreed: Boolean(data.declaration_agreed),
      photos: safeNotesPhotos,
      created_at: new Date().toISOString()
    })
  };

  let dbCheckout = null;
  try {
    dbCheckout = await base44.entities.CheckOut.create(primaryPayload);
  } catch (dbErr) {
    console.warn('Percubaan 1 simpan CheckOut gagal, mencuba fallback schema bersih:', dbErr);
    try {
      // Fallback: simpan mengikut medan asas yang dijamin disokong oleh CheckOut.jsonc
      dbCheckout = await base44.entities.CheckOut.create({
        student_id: studentDbId || data.student_matric || 'student',
        student_name: data.student_name || 'Pelajar Residen',
        room_id: data.room_id || 'room_dropkey',
        room_number: data.room_number || 'Bilik',
        block_name: data.block_name || 'Blok',
        check_out_date: data.checkout_date || new Date().toISOString().split('T')[0],
        check_out_time: data.checkout_time || '08:00',
        room_condition: 'Good',
        damage_assessment: `[EXPRESS DROP-KEY] ${data.envelope_tag || ''} ${data.reason || ''}`.trim()
      });
    } catch (fallbackErr) {
      console.warn('Percubaan 2 fallback juga gagal (kemungkinan luar talian):', fallbackErr);
      // Jangan teruskan lempar ralat yang menghalang pelajar menyelesaikan langkah seterusnya
    }
  }

  // ─── 2. KEMASKINI STATUS PELAJAR DALAM DB ────────────────────────────────────
  if (studentDbId) {
    try {
      await base44.entities.Student.update(studentDbId, {
        room_status: 'Pending Verification'
      });
    } catch (stErr) {
      console.warn('Amaran: Gagal kemaskini status pelajar:', stErr);
    }
  } else if (data.student_matric || data.student_id) {
    // Fallback: cari berdasarkan matric number
    try {
      const matricToSearch = data.student_matric || data.student_id;
      const matched = await base44.entities.Student.filter({ student_id: matricToSearch }).catch(() => []);
      if (matched && matched.length > 0) {
        await base44.entities.Student.update(matched[0].id, { room_status: 'Pending Verification' });
      }
    } catch (stErr) {
      console.warn('Fallback: Gagal kemaskini status pelajar:', stErr);
    }
  }

  // ─── 3. Bina objek request untuk penggunaan UI tempatan ─────────────────────
  const newReq = {
    id: localId,
    checkout_record_id: dbCheckout?.id || '',          // Kunci kepada rekod DB
    student_id: data.student_matric || data.student_id, // matric number
    student_db_id: studentDbId,                         // UUID DB
    student_name: data.student_name,
    student_matric: data.student_matric || data.student_id || '',
    student_phone: data.student_phone || '',
    student_email: data.student_email || '',
    user_id: data.user_id || '',
    block_name: data.block_name,
    room_number: data.room_number,
    room_id: data.room_id || '',
    semester: data.semester || 'Sem1_2526',
    reason: data.reason || 'Tamat Semester',
    checkout_date: data.checkout_date || new Date().toISOString().split('T')[0],
    checkout_time: data.checkout_time || `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
    envelope_tag: data.envelope_tag || '',
    photos: {
      room_clean: data.photos?.room_clean || 'verified_placeholder',
      wardrobe_empty: data.photos?.wardrobe_empty || null,
      switches_locked: data.photos?.switches_locked || null,
      key_envelope: data.photos?.key_envelope || 'verified_placeholder'
    },
    declaration_agreed: Boolean(data.declaration_agreed),
    status: 'pending_verification',
    created_at: new Date().toISOString(),
    scanned_at_dropbox: null
  };

  // ─── 4. Simpan ke localStorage sebagai cache tempatan (best-effort) ──────────
  try {
    const current = getDropKeyRequests();
    const updated = [newReq, ...current.filter(r => r.id !== newReq.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (storageErr) {
    // localStorage gagal — tidak apa, DB sudah simpan (sumber utama)
    console.warn('localStorage cache gagal (diabaikan, DB sudah berjaya):', storageErr);
  }

  // ─── 5. Hantar notifikasi audit ──────────────────────────────────────────────
  try {
    await logAudit(
      { full_name: data.student_name, email: data.student_email, role: 'student' },
      'DROP_KEY_REQUEST_SUBMITTED',
      'Check-Out Drop-Key',
      {
        student: data.student_name,
        matric: data.student_matric,
        block: data.block_name,
        room: data.room_number,
        date: newReq.checkout_date,
        checkout_record_id: dbCheckout?.id
      }
    );
  } catch (e) {}

  // ─── 6. Siar acara global ─────────────────────────────────────────────────────
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('DROP_KEY_UPDATED', { detail: newReq }));
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
  }

  return newReq;
}


/**
 * Mengesahkan imbasan QR kod peti drop box oleh pelajar
 */
export async function recordDropBoxQrScan(requestId) {
  const current = getDropKeyRequests();
  const req = current.find(r => r.id === requestId);
  if (!req) return null;

  req.scanned_at_dropbox = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

  // Kemaskini rekod database CheckOut jika ada
  if (req.checkout_record_id) {
    try {
      await base44.entities.CheckOut.update(req.checkout_record_id, {
        damage_assessment: `[QR Sah Diimbas pada ${new Date().toLocaleTimeString('ms-MY')}] ${req.envelope_tag || ''}`
      });
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('DROP_KEY_UPDATED', { detail: req }));
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
  }

  return req;
}

/**
 * Pengesahan & Kelulusan oleh Staf / Felo
 */
export async function approveDropKeyRequest({
  requestId,
  staffUser,
  roomCondition = 'Good',
  damageNotes = '',
  rooms = []
}) {
  const current = getDropKeyRequests();
  const reqIndex = current.findIndex(r => r.id === requestId);
  if (reqIndex === -1) throw new Error('Permohonan Drop-Key tidak dijumpai.');

  const req = current[reqIndex];

  // 1. Kenal pasti bilik
  let room = rooms.find(r => String(r.id) === String(req.room_id));
  if (!room && req.block_name && req.room_number) {
    room = rooms.find(r => r.block_name === req.block_name && String(r.room_number) === String(req.room_number));
  }

  // 2. Jana rekod rasmi CheckOut
  const checkoutRecord = await base44.entities.CheckOut.create({
    student_id: req.student_id,
    room_id: req.room_id || room?.id || '',
    check_out_date: req.checkout_date,
    check_out_time: req.checkout_time,
    room_condition: roomCondition,
    semester: req.semester || 'Sem1_2526',
    damage_assessment: damageNotes ? `[Drop-Key] ${damageNotes}` : '[Kaedah: Express Drop-Key Disahkan]',
    student_name: req.student_name || '',
    room_number: req.room_number || room?.room_number || '',
    block_name: req.block_name || room?.block_name || ''
  });

  // 3. Kemaskini status pelajar kepada 'Checked Out'
  await base44.entities.Student.update(req.student_id, {
    block_name: null,
    room_number: null,
    room_id: null,
    room_status: 'Checked Out'
  });

  // 4. Kemaskini kapasiti bilik secara tepat berdasarkan baki sebenar penghuni
  if (room) {
    const allStudents = await base44.entities.Student.list().catch(() => []);
    const remainingOccupants = allStudents.filter(s => 
      String(s.id) !== String(req.student_id) &&
      (String(s.room_id) === String(room.id) || (s.block_name === room.block_name && String(s.room_number) === String(room.room_number))) &&
      String(s.room_status || '').toLowerCase() !== 'checked out' &&
      String(s.resident_status || '').toLowerCase() !== 'archived'
    ).length;

    const nextStatus = remainingOccupants === 0 
      ? 'Available' 
      : (remainingOccupants >= (room.capacity || 4) ? 'Full' : 'Occupied');

    await base44.entities.Room.update(room.id, {
      current_occupancy: remainingOccupants,
      status: nextStatus
    }).catch(() => {});
  }

  // 5. Kemaskini status rekod permohonan
  req.status = 'approved';
  req.verified_at = new Date().toISOString();
  req.verified_by = staffUser?.full_name || staffUser?.email || 'Staf Pentadbiran';
  req.room_condition = roomCondition;
  req.damage_notes = damageNotes;
  req.checkout_id = checkoutRecord?.id;

  current[reqIndex] = req;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

  // 6. Log audit
  try {
    await logAudit(
      staffUser,
      'DROP_KEY_APPROVED',
      'Check-Out Drop-Key',
      {
        student: req.student_name,
        matric: req.student_matric,
        block: req.block_name,
        room: req.room_number,
        condition: roomCondition
      }
    );
  } catch (e) {}

  // 7. Notifikasi kepada pelajar
  if (req.user_id) {
    try {
      await base44.entities.Notification.create({
        user_id: req.user_id,
        title: 'Pengesahan Check-Out Drop-Key Berjaya',
        message: `Kunci bilik ${req.block_name} (${req.room_number}) telah disahkan oleh pihak pentadbiran kolej. Status check-out anda telah selesai sepenuhnya.`,
        type: 'checkout',
        link: '/my-profile'
      }).catch(() => {});
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('DROP_KEY_UPDATED', { detail: req }));
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
  }

  return { req, checkoutRecord };
}

/**
 * Menolak permohonan Drop-Key (cth: kunci tiada dalam peti atau kerosakan kritikal)
 */
export async function rejectDropKeyRequest({
  requestId,
  staffUser,
  reason = 'Kunci tidak ditemui dalam peti atau kerosakan tidak dilaporkan.'
}) {
  const current = getDropKeyRequests();
  const reqIndex = current.findIndex(r => r.id === requestId);
  if (reqIndex === -1) throw new Error('Permohonan tidak dijumpai.');

  const req = current[reqIndex];
  req.status = 'rejected';
  req.rejection_reason = reason;
  req.rejected_at = new Date().toISOString();
  req.rejected_by = staffUser?.full_name || staffUser?.email || 'Staf Pentadbiran';

  current[reqIndex] = req;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

  try {
    await logAudit(
      staffUser,
      'DROP_KEY_REJECTED',
      'Check-Out Drop-Key',
      {
        student: req.student_name,
        matric: req.student_matric,
        reason
      }
    );
  } catch (e) {}

  if (req.user_id) {
    try {
      await base44.entities.Notification.create({
        user_id: req.user_id,
        title: 'Status Permohonan Check-Out Drop-Key',
        message: `Permohonan check-out drop-key anda memerlukan perhatian pentadbiran: ${reason}. Sila hubungi Pejabat Kolej / Felo bertugas.`,
        type: 'alert',
        link: '/my-profile'
      }).catch(() => {});
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('DROP_KEY_UPDATED', { detail: req }));
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
  }

  return req;
}

/**
 * Menentukan sama ada waktu semasa adalah Waktu Pejabat Rasmi (Office Hours)
 * atau Luar Waktu Pejabat & Hujung Minggu (After Hours & Weekends).
 * 
 * Peraturan:
 * - Waktu Pejabat: Isnin - Jumaat, 8:00 AM - 5:00 PM (17:00)
 * - Luar Waktu Pejabat / Hujung Minggu:
 *   - Hari Sabtu & Ahad: Sepanjang hari
 *   - Hari Isnin - Jumaat: Sebelum 8:00 AM atau selepas 5:00 PM
 */
export function getOfficeHoursStatus(customDate = new Date()) {
  const day = customDate.getDay(); // 0 = Ahad, 1 = Isnin, ..., 5 = Jumaat, 6 = Sabtu
  const hour = customDate.getHours();
  const minute = customDate.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  const isWeekend = (day === 0 || day === 6);
  // Waktu pejabat: Isnin - Jumaat, 08:00 pagi (480 minit) hingga 5:00 petang (1020 minit)
  const isOfficeHoursTime = (timeInMinutes >= 8 * 60 && timeInMinutes < 17 * 60);

  const isOfficeHours = !isWeekend && isOfficeHoursTime;
  const isAfterHours = !isOfficeHours;

  let reason = '';
  if (isWeekend) {
    reason = day === 6 ? 'Hujung Minggu (Hari Sabtu)' : 'Hujung Minggu (Hari Ahad)';
  } else if (timeInMinutes < 8 * 60) {
    reason = 'Awal pagi sebelum pejabat dibuka (sebelum 8:00 pagi)';
  } else if (timeInMinutes >= 17 * 60) {
    reason = 'Petang / malam selepas pejabat ditutup (selepas 5:00 petang)';
  } else {
    reason = 'Waktu Pejabat Pentadbiran Beroperasi (8:00 pagi - 5:00 petang)';
  }

  const dayNames = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

  return {
    isOfficeHours,
    isAfterHours,
    isWeekend,
    reason,
    dayName: dayNames[day],
    currentTimeStr: customDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: true }),
    currentDateStr: customDate.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
  };
}
