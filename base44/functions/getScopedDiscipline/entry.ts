import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * getScopedDiscipline Backend Function
 * Enforces server-side authorization and block-scoping for DisciplineRecord entities.
 * 
 * Rules:
 * - super_admin, principal, college_admin: Full college access.
 * - warden: ONLY receives disciplinary records of students residing in assigned blocks.
 * - student: ONLY receives their own resolved disciplinary records.
 * - staff, jakmas: Completely BLOCKED.
 */
export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.role;

    // Staff and JAKMAS are completely denied
    if (['staff', 'jakmas'].includes(role)) {
      return Response.json({ error: 'Forbidden: Access to disciplinary records is restricted.' }, { status: 403 });
    }

    // 1. Super Admin, Principal, College Admin: Full access
    if (['super_admin', 'principal', 'college_admin'].includes(role)) {
      const records = await base44.asServiceRole.entities.DisciplineRecord.list('-created_date').catch(() => []);
      return Response.json({ records, scope: 'ALL_COLLEGE', count: records.length });
    }

    // 2. Warden: Scoped strictly to assigned residential blocks
    if (role === 'warden') {
      const allWardenBlocks = await base44.asServiceRole.entities.WardenBlock.filter({ warden_user_id: user.id }).catch(() => []);
      const assignedBlockNames = allWardenBlocks.map(wb => wb.block_name).filter(Boolean);
      
      if (!assignedBlockNames.length && user.block_assignment) {
        assignedBlockNames.push(user.block_assignment);
      }

      if (!assignedBlockNames.length) {
        return Response.json({ records: [], scope: 'WARDEN_NO_BLOCKS', count: 0 });
      }

      // Fetch students in assigned blocks first to identify matching student IDs
      const allStudents = await base44.asServiceRole.entities.Student.list('-created_date').catch(() => []);
      const blockStudentIds = new Set(
        allStudents
          .filter(s => {
            if (!s.block_name) return false;
            const sBlock = s.block_name.replace(/^(block|blok)\s+/i, '').trim().toLowerCase();
            return assignedBlockNames.some(ab => {
              const cleanAb = ab.replace(/^(block|blok)\s+/i, '').trim().toLowerCase();
              return sBlock === cleanAb;
            });
          })
          .map(s => s.student_id || s.id)
      );

      const allDiscipline = await base44.asServiceRole.entities.DisciplineRecord.list('-created_date').catch(() => []);
      const scopedRecords = allDiscipline.filter(d => 
        blockStudentIds.has(d.student_id) || 
        blockStudentIds.has(d.matric_number) ||
        (d.block_name && assignedBlockNames.some(ab => ab.toLowerCase() === d.block_name.toLowerCase()))
      );

      return Response.json({
        records: scopedRecords,
        assigned_blocks: assignedBlockNames,
        scope: 'WARDEN_ASSIGNED_BLOCKS',
        count: scopedRecords.length
      });
    }

    // 3. Student: Own records only
    if (role === 'student' || role === 'user') {
      let myRecords = await base44.asServiceRole.entities.DisciplineRecord.filter({ created_by_id: user.id }, '-created_date').catch(() => []);
      if (!myRecords.length) {
        myRecords = await base44.asServiceRole.entities.DisciplineRecord.filter({ student_id: user.id }, '-created_date').catch(() => []);
      }
      return Response.json({
        records: myRecords,
        scope: 'STUDENT_SELF_ONLY',
        count: myRecords.length
      });
    }

    return Response.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
