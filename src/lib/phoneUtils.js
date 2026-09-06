/**
 * Phone & Complainant Utilities for MyKKTF Maintenance & Dossier modules.
 * Standardizes Malaysian phone formats, resolves complainant details (name, role, phone, email)
 * from student, felo/warden and user records, and formats links for WhatsApp direct dispatch.
 */

export function cleanPhoneDigits(rawPhone) {
  if (!rawPhone) return '';
  return String(rawPhone).replace(/\D/g, '');
}

/**
 * Normalizes a phone number to standard international WhatsApp format: 601XXXXXXXX
 */
export function formatWhatsAppDigits(rawPhone) {
  const digits = cleanPhoneDigits(rawPhone);
  if (!digits) return '';
  if (digits.startsWith('60')) return digits;
  if (digits.startsWith('0')) return '60' + digits.slice(1);
  if (digits.startsWith('1')) return '60' + digits;
  return digits;
}

/**
 * Formats a phone number for formal document display: +60 1X-XXXX XXXX
 */
export function formatDisplayPhone(rawPhone) {
  const waDigits = formatWhatsAppDigits(rawPhone);
  if (!waDigits) return '-';
  if (waDigits.startsWith('60')) {
    const local = waDigits.slice(2);
    if (local.length === 9) {
      // 9-digit local (e.g., +60 12-345 6789)
      return `+60 ${local.slice(0, 2)}-${local.slice(2, 5)} ${local.slice(5)}`;
    } else if (local.length >= 10) {
      // 10-digit local (e.g., +60 11-2345 6789)
      return `+60 ${local.slice(0, 2)}-${local.slice(2, 6)} ${local.slice(6)}`;
    }
    return `+60 ${local}`;
  }
  return rawPhone;
}

/**
 * Resolves the complainant's phone number by checking:
 * 1. request.phone_number
 * 2. request.phone
 * 3. request.student_phone
 * 4. Felo / Warden directory (wardensMap / WardenBlock)
 * 5. Student directory (studentsMap by student_id, student_matric, or full_name)
 * 6. currentUser fallback if matching reporter identity
 */
export function resolveComplainantPhone(request, studentsMap = {}, wardensMap = {}, currentUser = null) {
  if (!request) return '';

  // 1. Direct field on request object
  if (request.phone_number && String(request.phone_number).trim()) {
    return String(request.phone_number).trim();
  }
  if (request.phone && String(request.phone).trim()) {
    return String(request.phone).trim();
  }
  if (request.student_phone && String(request.student_phone).trim()) {
    return String(request.student_phone).trim();
  }

  const sId = request.student_id;
  const reqName = request.student_name || '';

  // 2. Lookup in Felo / Warden directory (if reported by a Felo / Staff)
  if (wardensMap && typeof wardensMap === 'object') {
    if (sId && wardensMap[sId]) {
      const w = wardensMap[sId];
      const wp = w.phone || w.phone_number || w.whatsapp_number;
      if (wp) return String(wp).trim();
    }

    const wardenValues = Object.values(wardensMap);
    const foundWarden = wardenValues.find(w => {
      if (!w) return false;
      if (w.warden_user_id && w.warden_user_id === sId) return true;
      if (w.warden_name && reqName && reqName.toLowerCase().includes(w.warden_name.toLowerCase())) return true;
      if (w.block_name && request.block_name && w.block_name.toLowerCase() === request.block_name.toLowerCase() && (reqName.toLowerCase().includes('felo') || reqName.toLowerCase().includes('warden'))) return true;
      return false;
    });

    if (foundWarden) {
      const wp = foundWarden.phone || foundWarden.phone_number || foundWarden.whatsapp_number;
      if (wp) return String(wp).trim();
    }
  }

  // 3. Lookup in Student directory
  if (sId && studentsMap) {
    if (studentsMap[sId]) {
      const s = studentsMap[sId];
      const sp = s.phone_number || s.phone || s.contact_number || s.parent_phone;
      if (sp) return String(sp).trim();
    }
  }

  // 4. Fallback scan by student name or matric if available
  if (studentsMap && typeof studentsMap === 'object') {
    const studentValues = Object.values(studentsMap);
    const found = studentValues.find(s => {
      if (!s) return false;
      if (s.id && s.id === sId) return true;
      if (s.student_id && s.student_id === sId) return true;
      if (reqName && s.full_name && reqName.toLowerCase().includes(s.full_name.toLowerCase())) return true;
      if (request.room_number && s.room_number && s.room_number === request.room_number && s.block_name === request.block_name) return true;
      return false;
    });

    if (found) {
      const sp = found.phone_number || found.phone || found.contact_number;
      if (sp) return String(sp).trim();
    }
  }

  // 5. Fallback from current logged in user (if matched)
  if (currentUser) {
    const isCurrent = 
      (sId && (currentUser.id === sId || currentUser.user_id === sId)) ||
      (reqName && (currentUser.full_name && reqName.includes(currentUser.full_name))) ||
      (reqName && (currentUser.name && reqName.includes(currentUser.name)));

    if (isCurrent) {
      const cp = currentUser.phone_number || currentUser.phone || currentUser.contact_number || (currentUser.id ? localStorage.getItem(`warden_phone_${currentUser.id}`) : '');
      if (cp) return String(cp).trim();
    }
  }

  return '';
}

/**
 * Resolves full complainant information:
 * - name (Clean Name)
 * - role (Pelajar / Felo / Warden / Staf Pentadbiran)
 * - phone & displayPhone & waDigits
 * - email
 * - matricOrId
 */
export function resolveComplainantFullDetails(request, studentsMap = {}, wardensMap = {}, currentUser = null) {
  if (!request) {
    return {
      name: '-',
      role: 'Pelajar',
      phone: '',
      displayPhone: '-',
      waDigits: '',
      email: '',
      matricOrId: ''
    };
  }

  const rawName = request.student_name || '';
  const sId = request.student_id || '';
  
  // 1. Resolve phone
  const phone = resolveComplainantPhone(request, studentsMap, wardensMap, currentUser);
  const displayPhone = formatDisplayPhone(phone);
  const waDigits = formatWhatsAppDigits(phone);

  // 2. Resolve Role & Clean Name
  let name = rawName;
  let role = 'Pelajar';

  // Extract explicit role tag if present in name e.g. "Ahmad [Felo / Warden - Block B]"
  const roleMatch = rawName.match(/\[(.*?)\]/);
  if (roleMatch && roleMatch[1]) {
    role = roleMatch[1].trim();
    name = rawName.replace(/\[.*?\]/g, '').trim();
  } else if (rawName.toLowerCase().includes('felo') || rawName.toLowerCase().includes('warden')) {
    role = 'Felo / Warden';
  } else if (rawName.toLowerCase().includes('staf') || rawName.toLowerCase().includes('staff')) {
    role = 'Staf Pentadbiran';
  } else if (rawName.toLowerCase().includes('jakmas')) {
    role = 'JAKMAS';
  } else if (rawName.toLowerCase().includes('pentadbir') || rawName.toLowerCase().includes('admin')) {
    role = 'Pentadbir';
  } else if (wardensMap && (wardensMap[sId] || Object.values(wardensMap).some(w => w?.warden_user_id === sId))) {
    role = 'Felo / Warden';
  } else {
    role = 'Pelajar';
  }

  if (!name || name === '-') {
    name = request.created_by || 'Pengadu';
  }

  // 3. Resolve Email
  let email = request.email || request.student_email || '';
  if (!email && sId && studentsMap && studentsMap[sId]) {
    email = studentsMap[sId].email || '';
  }
  if (!email && sId && wardensMap && wardensMap[sId]) {
    email = wardensMap[sId].warden_email || wardensMap[sId].email || '';
  }
  if (!email && currentUser) {
    const isCurrent = 
      (sId && (currentUser.id === sId || currentUser.user_id === sId)) ||
      (rawName && (currentUser.full_name && rawName.includes(currentUser.full_name))) ||
      (rawName && (currentUser.name && rawName.includes(currentUser.name)));
    if (isCurrent) {
      email = currentUser.email || '';
    }
  }

  // 4. Resolve Matric / ID
  let matricOrId = request.student_id || '';
  if (sId && studentsMap && studentsMap[sId]?.student_id) {
    matricOrId = studentsMap[sId].student_id;
  }

  return {
    name,
    role,
    phone,
    displayPhone,
    waDigits,
    email,
    matricOrId
  };
}
