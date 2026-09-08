import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * getScopedLeaves Backend Function
 * Enforces server-side authorization and block-scoping for LeaveApplication records.
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

    // 1. Super Admin, Principal, College Admin: College-wide access
    if (['super_admin', 'principal', 'college_admin'].includes(role)) {
      const leaves = await base44.asServiceRole.entities.LeaveApplication.list('-created_date').catch(() => []);
      return Response.json({ leaves, scope: 'ALL_COLLEGE', count: leaves.length });
    }

    // 2. Warden: Scoped strictly to assigned residential blocks
    if (role === 'warden') {
      const allWardenBlocks = await base44.asServiceRole.entities.WardenBlock.filter({ warden_user_id: user.id }).catch(() => []);
      const assignedBlockNames = allWardenBlocks.map(wb => wb.block_name).filter(Boolean);
      
      if (!assignedBlockNames.length && user.block_assignment) {
        assignedBlockNames.push(user.block_assignment);
      }

      if (!assignedBlockNames.length) {
        return Response.json({ leaves: [], scope: 'WARDEN_NO_BLOCKS', count: 0 });
      }

      const allLeaves = await base44.asServiceRole.entities.LeaveApplication.list('-created_date').catch(() => []);
      const scopedLeaves = allLeaves.filter(leave => {
        if (!leave.block_name) return false;
        const leaveBlock = leave.block_name.replace(/^(block|blok)\s+/i, '').trim().toLowerCase();
        return assignedBlockNames.some(ab => {
          const cleanAb = ab.replace(/^(block|blok)\s+/i, '').trim().toLowerCase();
          return leaveBlock === cleanAb;
        });
      });

      return Response.json({
        leaves: scopedLeaves,
        assigned_blocks: assignedBlockNames,
        scope: 'WARDEN_ASSIGNED_BLOCKS',
        count: scopedLeaves.length
      });
    }

    // 3. Student: Own records only
    if (role === 'student' || role === 'user') {
      let myLeaves = await base44.asServiceRole.entities.LeaveApplication.filter({ created_by_id: user.id }, '-created_date').catch(() => []);
      if (!myLeaves.length) {
        myLeaves = await base44.asServiceRole.entities.LeaveApplication.filter({ student_id: user.id }, '-created_date').catch(() => []);
      }
      return Response.json({
        leaves: myLeaves,
        scope: 'STUDENT_SELF_ONLY',
        count: myLeaves.length
      });
    }

    // 4. Staff: Denied or minimal operational count
    if (role === 'staff') {
      return Response.json({ leaves: [], scope: 'STAFF_RESTRICTED', message: 'Staf tidak mempunyai akses terus ke permohonan keluar pelajar.' });
    }

    return Response.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
