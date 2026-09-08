import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * getScopedStudents Backend Function
 * Enforces server-side authorization and block-scoping before returning student records to the client.
 * 
 * Rules:
 * - super_admin, principal, college_admin: Full access to student records.
 * - warden: ONLY receives students residing in blocks assigned to them in WardenBlock.
 * - staff: Receives minimal operational records (name, matric, room, block, status) for check-in/out.
 * - student: Receives ONLY their own student record.
 * - jakmas: Receives directory with masked IC, masked phone, stripped parent income/medical data.
 */
export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.role;
    const body = await req.json().catch(() => ({}));

    // 1. Super Admin, Principal, College Admin: Full access
    if (['super_admin', 'principal', 'college_admin'].includes(role)) {
      let query = {};
      if (body.block_name && body.block_name !== 'all') {
        query.block_name = body.block_name;
      }
      if (body.status && body.status !== 'all') {
        query.status = body.status;
      }
      const students = await base44.asServiceRole.entities.Student.filter(query, '-created_date').catch(() => []);
      return Response.json({ students, scope: 'ALL_COLLEGE', count: students.length });
    }

    // 2. Warden (Felo): Assigned blocks ONLY
    if (role === 'warden') {
      const allWardenBlocks = await base44.asServiceRole.entities.WardenBlock.filter({ warden_user_id: user.id }).catch(() => []);
      const assignedBlockNames = allWardenBlocks.map(wb => wb.block_name).filter(Boolean);
      
      // If no blocks assigned in database, also check if block_name is in user object
      if (!assignedBlockNames.length && user.block_assignment) {
        assignedBlockNames.push(user.block_assignment);
      }

      if (!assignedBlockNames.length) {
        return Response.json({ students: [], scope: 'WARDEN_NO_BLOCKS', count: 0 });
      }

      // Fetch students belonging ONLY to the warden's assigned blocks
      const allStudents = await base44.asServiceRole.entities.Student.list('-created_date').catch(() => []);
      const scopedStudents = allStudents.filter(s => {
        if (!s.block_name) return false;
        const sBlock = s.block_name.replace(/^(block|blok)\s+/i, '').trim().toLowerCase();
        return assignedBlockNames.some(ab => {
          const cleanAb = ab.replace(/^(block|blok)\s+/i, '').trim().toLowerCase();
          return sBlock === cleanAb;
        });
      });

      return Response.json({
        students: scopedStudents,
        assigned_blocks: assignedBlockNames,
        scope: 'WARDEN_ASSIGNED_BLOCKS',
        count: scopedStudents.length
      });
    }

    // 3. Staff: Operational check-in/out records with minimized fields
    if (role === 'staff') {
      const allStudents = await base44.asServiceRole.entities.Student.list('-created_date').catch(() => []);
      const operationalStudents = allStudents.map(s => ({
        id: s.id,
        student_id: s.student_id,
        full_name: s.full_name,
        gender: s.gender,
        block_name: s.block_name,
        room_number: s.room_number,
        room_status: s.room_status,
        status: s.status,
        check_in_date: s.check_in_date,
        // Sensitive data omitted / masked for staff
        phone: s.phone ? `${s.phone.slice(0, 4)}-***-${s.phone.slice(-4)}` : '-',
        ic_passport: '[RESTRICTED_FOR_STAFF]',
        parent_income: '[RESTRICTED]',
        medical_condition: '[RESTRICTED]'
      }));

      return Response.json({
        students: operationalStudents,
        scope: 'STAFF_OPERATIONAL_MINIMAL',
        count: operationalStudents.length
      });
    }

    // 4. Student: Own record only
    if (role === 'student' || role === 'user') {
      let myStudents = await base44.asServiceRole.entities.Student.filter({ user_id: user.id }).catch(() => []);
      if (!myStudents.length) {
        myStudents = await base44.asServiceRole.entities.Student.filter({ email: user.email }).catch(() => []);
      }
      return Response.json({
        students: myStudents,
        scope: 'STUDENT_SELF_ONLY',
        count: myStudents.length
      });
    }

    // 5. JAKMAS: Masked directory
    if (role === 'jakmas') {
      const activeStudents = await base44.asServiceRole.entities.Student.filter({ status: 'Active' }).catch(() => []);
      const maskedDirectory = activeStudents.map(s => ({
        id: s.id,
        student_id: s.student_id,
        full_name: s.full_name,
        faculty: s.faculty,
        programme: s.programme,
        year_of_study: s.year_of_study,
        block_name: s.block_name,
        room_number: s.room_number,
        // Masked personal fields
        phone: s.phone ? `${s.phone.slice(0, 4)}-***-${s.phone.slice(-4)}` : '-',
        email: s.email,
        ic_passport: s.ic_passport ? `******-**-${s.ic_passport.slice(-4)}` : '-',
        parent_name: '[RESTRICTED]',
        parent_phone: '[RESTRICTED]',
        parent_income: '[RESTRICTED]',
        emergency_contact: '[RESTRICTED]',
        medical_condition: '[RESTRICTED]'
      }));

      return Response.json({
        students: maskedDirectory,
        scope: 'JAKMAS_DIRECTORY_MASKED',
        count: maskedDirectory.length
      });
    }

    return Response.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
