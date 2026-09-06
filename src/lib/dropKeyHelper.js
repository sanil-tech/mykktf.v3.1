import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/audit';

const STORAGE_KEY = 'kktf_drop_key_requests';

/**
 * Mengambil semua permohonan Drop-Key Check-Out
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
 * Menghantar permohonan baharu Express Drop-Key Check-Out oleh pelajar
 */
export async function submitDropKeyRequest(data) {
  const current = getDropKeyRequests();
  
  const newReq = {
    id: `dk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    student_id: data.student_id,
    student_name: data.student_name,
    student_matric: data.student_matric,
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
    status: 'pending_verification', // 'pending_verification' | 'approved' | 'rejected'
    created_at: new Date().toISOString(),
    scanned_at_dropbox: null
  };

  const updated = [newReq, ...current.filter(r => r.id !== newReq.id)];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (storageErr) {
    console.warn('Had kuota localStorage dicapai, menyimpan tanpa imej berat:', storageErr);
    // Fallback: simpan tanpa data URL berat jika kuota browser penuh
    const compactReq = {
      ...newReq,
      photos: {
        room_clean: data.photos?.room_clean ? 'uploaded_verified' : null,
        wardrobe_empty: data.photos?.wardrobe_empty ? 'uploaded_verified' : null,
        switches_locked: data.photos?.switches_locked ? 'uploaded_verified' : null,
        key_envelope: data.photos?.key_envelope ? 'uploaded_verified' : null
      }
    };
    const compactUpdated = [compactReq, ...current.filter(r => r.id !== newReq.id)];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactUpdated));
    } catch (e2) {
      console.error('Gagal simpan drop-key ke localStorage:', e2);
    }
  }

  // Hantar notifikasi sistem
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
        date: newReq.checkout_date
      }
    );
  } catch (e) {}

  return newReq;
}

/**
 * Mengesahkan imbasan QR kod peti drop box oleh pelajar
 */
export function recordDropBoxQrScan(requestId) {
  const current = getDropKeyRequests();
  const req = current.find(r => r.id === requestId);
  if (!req) return null;

  req.scanned_at_dropbox = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
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
