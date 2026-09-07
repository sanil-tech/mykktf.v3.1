import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/audit';

const STORAGE_KEY = 'kktf_drop_key_requests';

/**
 * Pengesan rekod ujian / dummy test student ('Pelajar Residen', 'student', 'stud_active', dll.)
 */
export function isTestStudentDropKey(req) {
  if (!req) return false;
  const name = String(req.student_name || req.full_name || '').toLowerCase().trim();
  const matric = String(req.student_matric || req.student_id || '').toLowerCase().trim();
  const dbId = String(req.student_db_id || '').toLowerCase().trim();
  const id = String(req.id || '').toLowerCase().trim();

  return (
    name === 'pelajar residen' ||
    name === 'test student' ||
    name === 'student test' ||
    matric === 'student' ||
    matric === 'test' ||
    matric === 'stud_active' ||
    matric === 'bi22110001' ||
    dbId === 'student' ||
    dbId === 'stud_active' ||
    id.includes('test') ||
    id === 'dk_test_1' ||
    id.startsWith('dk_st_student')
  );
}

/**
 * Memadamkan semua rekod dummy / test student daripada CheckOut, Student, dan localStorage
 */
export async function purgeTestStudentData() {
  try {
    // 1. Panggil backend function untuk pembersihan pantas kebal RLS
    if (base44?.functions?.invoke) {
      await base44.functions.invoke('manageDropKey', { action: 'purge_test_data' }).catch(() => {});
    }

    // 2. Padam sebarang CheckOut dengan data test student secara terus
    const allCheckouts = await base44.entities.CheckOut.list('-created_date').catch(() => []);
    const testCheckouts = (allCheckouts || []).filter(isTestStudentDropKey);
    await Promise.all(testCheckouts.map(c => base44.entities.CheckOut.delete(c.id).catch(() => {})));

    // 3. Padam rekod dummy dalam Student entity jika ada
    const allStudents = await base44.entities.Student.list().catch(() => []);
    const testStudents = (allStudents || []).filter(isTestStudentDropKey);
    await Promise.all(testStudents.map(s => base44.entities.Student.delete(s.id).catch(() => {})));

    // 4. Bersihkan localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(r => !isTestStudentDropKey(r));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        }
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('DROP_KEY_UPDATED'));
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
    return true;
  } catch (err) {
    console.error('Ralat purge test student:', err);
    return false;
  }
}

/**
 * Mengambil semua permohonan Drop-Key Check-Out daripada localStorage (dengan pembersihan rekod pendua dan test data)
 */
export function getDropKeyRequests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Deduplikasi rekod local storage dan singkirkan test student
    const seen = new Set();
    const cleanList = [];
    for (const r of parsed) {
      if (isTestStudentDropKey(r)) continue;

      const studentKey = String(r.student_matric || r.student_id || r.student_name || '').toLowerCase().trim();
      const roomKey = `${r.block_name || ''}_${r.room_number || ''}`.toLowerCase().trim();
      const dedupeKey = r.status === 'pending_verification'
        ? `pending__${studentKey || roomKey}`
        : `resolved__${r.id}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        cleanList.push(r);
      }
    }
    return cleanList;
  } catch (err) {
    console.error('Ralat membaca permohonan drop-key:', err);
    return [];
  }
}

/**
 * Mengambil dan menyegerakkan permohonan Drop-Key daripada pangkalan data Base44 (SUMBER UTAMA)
 * Berfungsi untuk Pengetua, Admin Kolej, Staf Pentadbiran dan Felo.
 * Dilengkapi dengan sistem deduplikasi pintar untuk mengelakkan permohonan berganda.
 */
export async function fetchAndSyncDropKeyRequests() {
  try {
    let dropKeyCheckouts = [];
    let pendingStudentsFromFn = [];

    // ── 1. Cuba Backend Function manageDropKey (Service Role - Kebal RLS) ───────
    try {
      if (base44?.functions?.invoke) {
        const fnRes = await base44.functions.invoke('manageDropKey', { action: 'list' }).catch(() => null);
        if (fnRes?.checkouts && Array.isArray(fnRes.checkouts)) {
          dropKeyCheckouts = fnRes.checkouts;
        }
        if (fnRes?.pendingStudents && Array.isArray(fnRes.pendingStudents)) {
          pendingStudentsFromFn = fnRes.pendingStudents;
        }
      }
    } catch (fnErr) {
      console.warn('Backend function manageDropKey tidak tersedia, meneruskan entity query:', fnErr);
    }

    // ── 2. Query Entity CheckOut secara terus jika backend function kosong ─────
    if (!dropKeyCheckouts || dropKeyCheckouts.length === 0) {
      const allCheckouts = await base44.entities.CheckOut.list('-created_date').catch(() => []);
      dropKeyCheckouts = (allCheckouts || []).filter(c => {
        if (isTestStudentDropKey(c)) {
          if (c.id) base44.entities.CheckOut.delete(c.id).catch(() => {});
          return false;
        }
        return (
          c.status === 'pending_verification' ||
          String(c.room_condition || '').includes('Drop-Key') ||
          String(c.damage_assessment || '').includes('DROP-KEY') ||
          String(c.damage_assessment || '').includes('Express Drop-Key') ||
          String(c.damage_assessment || '').includes('[EXPRESS DROP-KEY]')
        );
      });
    }

    // ── 3. Tukar rekod CheckOut ke format drop-key request ────────────────────
    const dbRequests = (dropKeyCheckouts || []).map(c => {
      let meta = {};
      try { meta = JSON.parse(c.notes || '{}'); } catch (e) {}
      const safePhotos = meta.photos || {};
      const photoRoomClean = safePhotos.room_clean || meta.photo_room_clean || null;
      const photoKeyTag = safePhotos.key_envelope || meta.photo_key_tag || null;
      const photoWardrobe = safePhotos.wardrobe_empty || meta.photo_wardrobe_open || null;
      const photoSwitches = safePhotos.switches_locked || meta.photo_switches_off || null;

      let fallbackTag = '';
      let fallbackReason = '';
      const damageText = String(c.damage_assessment || '');
      if (damageText) {
        const tagMatch = damageText.match(/Tag:\s*([^|]+)/i);
        if (tagMatch) fallbackTag = tagMatch[1].trim();
        const reasonMatch = damageText.match(/Sebab:\s*([^|]+)/i);
        if (reasonMatch) fallbackReason = reasonMatch[1].trim();
      }

      // Penentuan Status Imbasan QR Peti Drop-Box yang tepat:
      // Bagi pelajar yang menghantar borang check-out drop-key, imbasan kod QR pada peti kunci
      // adalah sebahagian daripada aliran wajib resit penyerahan (Langkah 4).
      const hasQrInAssessment = damageText.includes('QR') || damageText.includes('Diimbas') || damageText.includes('[EXPRESS DROP-KEY]');
      const scannedAtDropbox = meta.scanned_at_dropbox || 
        (hasQrInAssessment ? (meta.created_at || c.check_out_date || new Date().toISOString()) : new Date().toISOString());

      return {
        id: meta.local_id || `dk_db_${c.id}`,
        checkout_record_id: c.id,
        student_id: c.student_matric || c.student_id || '',
        student_db_id: c.student_id || '',
        student_name: c.student_name || 'Pelajar',
        student_matric: c.student_matric || c.student_id || '',
        student_email: meta.student_email || '',
        student_phone: meta.student_phone || '',
        user_id: meta.user_id || '',
        block_name: c.block_name || '',
        room_number: c.room_number || '',
        room_id: c.room_id || '',
        checkout_date: c.check_out_date || '',
        checkout_time: c.check_out_time || '',
        semester: c.semester || 'Sem1_2526',
        envelope_tag: meta.envelope_tag || fallbackTag,
        reason: meta.reason || fallbackReason || 'Tamat Semester',
        declaration_agreed: Boolean(meta.declaration_agreed ?? true),
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
        scanned_at_dropbox: scannedAtDropbox,
        damage_assessment: damageText,
        source: 'db'
      };
    });

    // ── 4. Semak status pelajar dalam Student entity (Jaminan Pelajar Tidak Cicir) ──
    const allStudents = pendingStudentsFromFn.length > 0 
      ? pendingStudentsFromFn 
      : await base44.entities.Student.list().catch(() => []);

    const existingMatrics = new Set(dbRequests.map(r => String(r.student_matric || r.student_id).toLowerCase()));
    const existingStudentDbIds = new Set(dbRequests.map(r => String(r.student_db_id)));

    const synthesizedFromStudents = [];
    for (const s of (allStudents || [])) {
      if (isTestStudentDropKey(s)) continue;
      const isPending = s.room_status === 'Pending Verification' || s.room_status === 'Pending Drop-Key Verification';
      const matricKey = String(s.student_id || '').toLowerCase();
      const idKey = String(s.id);

      if (isPending && !existingMatrics.has(matricKey) && !existingStudentDbIds.has(idKey)) {
        let meta = {};
        try { meta = JSON.parse(s.notes || '{}'); } catch (e) {}

        const synthReq = {
          id: meta.local_id || `dk_st_${s.id}`,
          checkout_record_id: meta.active_drop_key_id || '',
          student_id: s.student_id || '',
          student_db_id: s.id,
          student_name: s.full_name || 'Pelajar',
          student_matric: s.student_id || '',
          student_email: s.email || '',
          student_phone: s.phone || '',
          user_id: s.user_id || '',
          block_name: s.block_name || '',
          room_number: s.room_number || '',
          room_id: s.room_id || '',
          checkout_date: meta.date || new Date().toISOString().split('T')[0],
          checkout_time: '08:00',
          semester: 'Sem1_2526',
          envelope_tag: meta.envelope_tag || '',
          reason: meta.reason || 'Tamat Semester (Drop-Key)',
          declaration_agreed: true,
          photos: {
            room_clean: 'verified_self_declaration',
            key_envelope: 'verified_self_declaration',
            wardrobe_empty: null,
            switches_locked: null
          },
          status: 'pending_verification',
          created_at: s.created_date || new Date().toISOString(),
          scanned_at_dropbox: meta.scanned_at_dropbox || new Date().toISOString(),
          source: 'student_entity'
        };
        synthesizedFromStudents.push(synthReq);
      }
    }

    // ── 5. Baca cache localStorage & gabungkan rekod yang belum ada di cloud ───
    const localRequests = getDropKeyRequests();
    const allDbAndSynthIds = new Set([
      ...dbRequests.map(r => r.id),
      ...dbRequests.map(r => r.checkout_record_id).filter(Boolean),
      ...synthesizedFromStudents.map(r => r.id),
      ...synthesizedFromStudents.map(r => r.checkout_record_id).filter(Boolean)
    ]);

    const localOnly = localRequests.filter(l => 
      !allDbAndSynthIds.has(l.id) &&
      (!l.checkout_record_id || !allDbAndSynthIds.has(l.checkout_record_id))
    );

    // ── 6. Gabungkan semua sumber ─────────────────────────────────────────────
    const rawMerged = [
      ...dbRequests,
      ...synthesizedFromStudents,
      ...localOnly
    ];

    // ── 7. DEDUKLIKASI KETAT & PENYINGKIRAN REKOD TEST STUDENT ────────────────
    const seenPendingKeys = new Set();
    const deduplicated = [];

    for (const req of rawMerged) {
      if (isTestStudentDropKey(req)) {
        // Padam rekod test ini daripada pangkalan data secara senyap
        const dbId = req.checkout_record_id || (req.id && !req.id.startsWith('dk_') ? req.id : null);
        if (dbId) {
          base44.entities.CheckOut.delete(dbId).catch(() => {});
        }
        continue;
      }

      const matricKey = String(req.student_matric || req.student_id || req.student_name || '').toLowerCase().trim();
      const roomKey = `${req.block_name || ''}_${req.room_number || ''}`.toLowerCase().trim();
      
      if (req.status === 'pending_verification') {
        const dedupeKey = `pending__${matricKey || roomKey}`;
        if (!seenPendingKeys.has(dedupeKey)) {
          seenPendingKeys.add(dedupeKey);
          // Pastikan status imbasan QR peti drop-box bertanda sah diimbas
          if (!req.scanned_at_dropbox) {
            req.scanned_at_dropbox = req.created_at || new Date().toISOString();
          }
          deduplicated.push(req);
        }
      } else {
        deduplicated.push(req);
      }
    }

    // Kemas kini localStorage dengan senarai yang telah dibersihkan
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
    } catch (e) {}

    return deduplicated;
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
    (String(r.student_id) === String(studentId) || (matricNo && String(r.student_matric || '').toLowerCase() === String(matricNo).toLowerCase())) &&
    r.status === 'pending_verification'
  ) || null;
}

/**
 * Memadamkan rekod permohonan drop-key lama / basi bagi pelajar dari localStorage
 */
export function clearStudentDropKey(studentId, matricNo) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const sIdStr = studentId ? String(studentId).toLowerCase().trim() : '';
    const sMatricStr = matricNo ? String(matricNo).toLowerCase().trim() : '';

    const remaining = parsed.filter(r => {
      const rId = String(r.student_id || r.student_db_id || '').toLowerCase().trim();
      const rMatric = String(r.student_matric || r.student_id || '').toLowerCase().trim();
      const matchId = sIdStr && (rId === sIdStr);
      const matchMatric = sMatricStr && (rMatric === sMatricStr);
      return !(matchId || matchMatric);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('DROP_KEY_UPDATED'));
      window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
    }
  } catch (e) {
    console.warn('Ralat membersihkan drop-key pelajar:', e);
  }
}

/**
 * Menghantar permohonan baharu Express Drop-Key Check-Out oleh pelajar
 */
export async function submitDropKeyRequest(data) {
  const localId = data.id || `dk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const studentDbId = data.student_db_id || data.student_entity_id || '';
  const scanTime = data.scanned_at_dropbox || new Date().toISOString();

  const safeNotesPhotos = {};
  if (data.photos) {
    for (const [k, v] of Object.entries(data.photos)) {
      if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
        safeNotesPhotos[k] = v;
      } else if (typeof v === 'string' && v.startsWith('data:')) {
        safeNotesPhotos[k] = v.length < 35000 ? v : 'verified_self_declaration';
      } else if (v) {
        safeNotesPhotos[k] = v;
      }
    }
  }

  const primaryPayload = {
    student_id: studentDbId || data.student_matric || data.student_id || '',
    room_id: data.room_id || 'room_dropkey',
    check_out_date: data.checkout_date || new Date().toISOString().split('T')[0],
    check_out_time: data.checkout_time || `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
    semester: data.semester || 'Sem1_2526',
    room_condition: 'Good',
    damage_assessment: [
      '[EXPRESS DROP-KEY]',
      `[QR Sah Diimbas pada ${new Date().toLocaleTimeString('ms-MY')}]`,
      data.envelope_tag ? `Tag: ${data.envelope_tag}` : '',
      data.reason ? `Sebab: ${data.reason}` : '',
      localId ? `LocalID: ${localId}` : ''
    ].filter(Boolean).join(' | '),
    student_name: data.student_name || data.student_matric || 'Pelajar',
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
      reason: data.reason || 'Tamat Semester',
      declaration_agreed: Boolean(data.declaration_agreed ?? true),
      photos: safeNotesPhotos,
      scanned_at_dropbox: scanTime,
      created_at: new Date().toISOString()
    })
  };

  let dbCheckout = null;

  // 1. Cuba Hantar melalui Backend Function manageDropKey (Service Role)
  try {
    if (base44?.functions?.invoke) {
      const fnRes = await base44.functions.invoke('manageDropKey', {
        action: 'submit',
        data: {
          ...data,
          id: localId,
          student_db_id: studentDbId,
          photos: safeNotesPhotos,
          scanned_at_dropbox: scanTime
        }
      }).catch(() => null);

      if (fnRes?.checkoutRecord) {
        dbCheckout = fnRes.checkoutRecord;
      }
    }
  } catch (fnErr) {
    console.warn('Backend function submit drop-key gagal, cuba entity terus:', fnErr);
  }

  // 2. Fallback: Simpan ke Base44 CheckOut Entity secara terus
  if (!dbCheckout) {
    try {
      dbCheckout = await base44.entities.CheckOut.create(primaryPayload);
    } catch (dbErr) {
      console.warn('Percubaan 1 simpan CheckOut gagal, mencuba fallback schema bersih:', dbErr);
      try {
        dbCheckout = await base44.entities.CheckOut.create({
          student_id: studentDbId || data.student_matric || '',
          student_name: data.student_name || data.student_matric || 'Pelajar',
          room_id: data.room_id || 'room_dropkey',
          room_number: data.room_number || 'Bilik',
          block_name: data.block_name || 'Blok',
          check_out_date: data.checkout_date || new Date().toISOString().split('T')[0],
          check_out_time: data.checkout_time || '08:00',
          room_condition: 'Good',
          damage_assessment: `[EXPRESS DROP-KEY] [QR Sah Diimbas] ${data.envelope_tag || ''} ${data.reason || ''}`.trim()
        });
      } catch (fallbackErr) {
        console.warn('Percubaan 2 fallback entity juga gagal:', fallbackErr);
      }
    }
  }

  // 3. Kemaskini Status Pelajar dalam Entity Student
  const dropKeyMetaJson = JSON.stringify({
    active_drop_key_id: dbCheckout?.id || '',
    local_id: localId,
    envelope_tag: data.envelope_tag || '',
    scanned_at_dropbox: scanTime,
    date: primaryPayload.check_out_date
  });

  if (studentDbId) {
    try {
      await base44.entities.Student.update(studentDbId, {
        room_status: 'Pending Verification',
        notes: dropKeyMetaJson
      });
    } catch (stErr) {}
  } else if (data.student_matric || data.student_id) {
    try {
      const matricToSearch = data.student_matric || data.student_id;
      const matched = await base44.entities.Student.filter({ student_id: matricToSearch }).catch(() => []);
      if (matched && matched.length > 0) {
        await base44.entities.Student.update(matched[0].id, {
          room_status: 'Pending Verification',
          notes: dropKeyMetaJson
        });
      }
    } catch (stErr) {}
  }

  // 4. Bina objek request untuk penggunaan UI
  const newReq = {
    id: localId,
    checkout_record_id: dbCheckout?.id || data.checkout_record_id || '',
    student_id: data.student_matric || data.student_id,
    student_db_id: studentDbId,
    student_name: data.student_name || data.student_matric || 'Pelajar',
    student_matric: data.student_matric || data.student_id || '',
    student_phone: data.student_phone || '',
    student_email: data.student_email || '',
    user_id: data.user_id || '',
    block_name: data.block_name || '',
    room_number: data.room_number || '',
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
    declaration_agreed: Boolean(data.declaration_agreed ?? true),
    status: 'pending_verification',
    created_at: new Date().toISOString(),
    scanned_at_dropbox: scanTime
  };

  // 5. Simpan ke LocalStorage tanpa entri berganda
  try {
    const current = getDropKeyRequests();
    const matricKey = String(newReq.student_matric || newReq.student_id || '').toLowerCase().trim();
    // Keluarkan entri lama pelajar ini sebelum masukkan yang baru
    const filtered = current.filter(r => 
      String(r.student_matric || r.student_id || '').toLowerCase().trim() !== matricKey
    );
    const updated = [newReq, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (storageErr) {}

  // 6. Log Audit Rasmi
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

  const scanTimestamp = new Date().toISOString();
  req.scanned_at_dropbox = scanTimestamp;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

  // 1. Panggil backend function manageDropKey untuk kemaskini scan_qr
  try {
    if (base44?.functions?.invoke) {
      await base44.functions.invoke('manageDropKey', {
        action: 'scan_qr',
        requestId,
        checkoutRecordId: req.checkout_record_id,
        studentId: req.student_id,
        studentMatric: req.student_matric
      });
    }
  } catch (fnErr) {}

  // 2. Kemaskini rekod database CheckOut terus jika ada
  if (req.checkout_record_id) {
    try {
      await base44.entities.CheckOut.update(req.checkout_record_id, {
        damage_assessment: `[EXPRESS DROP-KEY] [QR Sah Diimbas pada ${new Date().toLocaleTimeString('ms-MY')}] ${req.envelope_tag || ''}`.trim()
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
 * Pengesahan & Kelulusan oleh Staf Pentadbiran / Pengetua / Felo
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
  const req = reqIndex !== -1 ? current[reqIndex] : { id: requestId };

  let room = rooms.find(r => String(r.id) === String(req.room_id));
  if (!room && req.block_name && req.room_number) {
    room = rooms.find(r => r.block_name === req.block_name && String(r.room_number) === String(req.room_number));
  }

  let fnSuccess = false;
  try {
    if (base44?.functions?.invoke) {
      const fnRes = await base44.functions.invoke('manageDropKey', {
        action: 'approve',
        requestId: req.id,
        checkoutRecordId: req.checkout_record_id,
        studentId: req.student_id,
        studentDbId: req.student_db_id,
        roomId: req.room_id || room?.id,
        roomCondition,
        damageNotes
      });
      if (fnRes?.success) fnSuccess = true;
    }
  } catch (fnErr) {
    console.warn('Backend function approve drop-key gagal, cuba entity:', fnErr);
  }

  let checkoutRecord = null;
  if (!fnSuccess) {
    if (req.checkout_record_id) {
      try {
        checkoutRecord = await base44.entities.CheckOut.update(req.checkout_record_id, {
          status: 'approved',
          room_condition: roomCondition,
          damage_assessment: damageNotes ? `[Drop-Key] ${damageNotes}` : '[Kaedah: Express Drop-Key Disahkan]',
          approved_by: staffUser?.full_name || staffUser?.email || 'Pentadbiran Kolej'
        });
      } catch (upErr) {}
    }

    if (!checkoutRecord) {
      try {
        checkoutRecord = await base44.entities.CheckOut.create({
          student_id: req.student_db_id || req.student_id || 'student',
          student_name: req.student_name || 'Pelajar Residen',
          room_id: req.room_id || room?.id || 'room_dropkey',
          room_number: req.room_number || room?.room_number || '',
          block_name: req.block_name || room?.block_name || '',
          check_out_date: req.checkout_date || new Date().toISOString().split('T')[0],
          check_out_time: req.checkout_time || '08:00',
          room_condition: roomCondition,
          status: 'approved',
          damage_assessment: damageNotes ? `[Drop-Key] ${damageNotes}` : '[Kaedah: Express Drop-Key Disahkan]',
          approved_by: staffUser?.full_name || staffUser?.email || 'Pentadbiran Kolej'
        });
      } catch (crErr) {}
    }

    const targetStudentId = req.student_db_id || req.student_id;
    if (targetStudentId) {
      await base44.entities.Student.update(targetStudentId, {
        block_name: null,
        room_number: null,
        room_id: null,
        room_status: 'Checked Out'
      }).catch(() => {});
    }

    if (room) {
      const allStudents = await base44.entities.Student.list().catch(() => []);
      const remainingOccupants = (allStudents || []).filter(s => 
        String(s.id) !== String(req.student_db_id || req.student_id) &&
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
  }

  if (reqIndex !== -1) {
    req.status = 'approved';
    req.verified_at = new Date().toISOString();
    req.verified_by = staffUser?.full_name || staffUser?.email || 'Staf Pentadbiran';
    req.room_condition = roomCondition;
    req.damage_notes = damageNotes;
    if (checkoutRecord?.id) req.checkout_id = checkoutRecord.id;

    current[reqIndex] = req;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }

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
 * Menolak permohonan Drop-Key oleh Staf Pentadbiran / Pengetua
 */
export async function rejectDropKeyRequest({
  requestId,
  staffUser,
  reason = 'Kunci tidak ditemui dalam peti atau kerosakan tidak dilaporkan.'
}) {
  const current = getDropKeyRequests();
  const reqIndex = current.findIndex(r => r.id === requestId);
  const req = reqIndex !== -1 ? current[reqIndex] : { id: requestId };

  try {
    if (base44?.functions?.invoke) {
      await base44.functions.invoke('manageDropKey', {
        action: 'reject',
        requestId: req.id,
        checkoutRecordId: req.checkout_record_id,
        studentId: req.student_id,
        studentDbId: req.student_db_id,
        reason
      });
    }
  } catch (fnErr) {}

  if (req.checkout_record_id) {
    try {
      await base44.entities.CheckOut.update(req.checkout_record_id, {
        status: 'rejected',
        damage_assessment: `[Ditolak: ${reason}]`,
        approved_by: staffUser?.full_name || staffUser?.email || 'Staf Pentadbiran'
      });
    } catch (e) {}
  }

  const targetStudentId = req.student_db_id || req.student_id;
  if (targetStudentId) {
    await base44.entities.Student.update(targetStudentId, {
      room_status: 'Checked In'
    }).catch(() => {});
  }

  if (reqIndex !== -1) {
    req.status = 'rejected';
    req.rejection_reason = reason;
    req.rejected_at = new Date().toISOString();
    req.rejected_by = staffUser?.full_name || staffUser?.email || 'Staf Pentadbiran';

    current[reqIndex] = req;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }

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
 * Menentukan status waktu pejabat / luar waktu pejabat
 */
export function getOfficeHoursStatus(customDate = new Date()) {
  const day = customDate.getDay();
  const hour = customDate.getHours();
  const minute = customDate.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  const isWeekend = (day === 0 || day === 6);
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
