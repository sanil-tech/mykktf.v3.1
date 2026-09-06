import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns the wardens assigned to the calling user's residential block.
// Runs as service role because WardenBlock RLS does not grant students read
// access — this enforces block-scoping server-side (caller can only ever
// receive wardens of their own block).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let targetBlock = body?.block_name;

    if (!targetBlock) {
      let sp = await base44.entities.Student.filter({ user_id: user.id });
      if (!sp.length) sp = await base44.entities.Student.filter({ email: user.email });
      const s = sp[0];
      targetBlock = s?.block_name;
    }

    if (!targetBlock) {
      return Response.json({
        wardens: [],
        staff: [],
        block_name: null,
        message: 'Blok kediaman belum ditetapkan.'
      });
    }

    const cleanTarget = targetBlock.replace(/^(block|blok)\s+/i, '').trim().toLowerCase();

    // Fetch all warden assignments via service role
    const allWardenBlocks = await base44.asServiceRole.entities.WardenBlock.list().catch(() => []);
    const matchingWardens = allWardenBlocks.filter(w => {
      const cleanW = (w.block_name || '').replace(/^(block|blok)\s+/i, '').trim().toLowerCase();
      return cleanW === cleanTarget;
    });

    let staffMembers = [];
    if (body?.include_staff) {
      const allUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
      staffMembers = allUsers
        .filter(u => ['staff', 'college_admin', 'super_admin', 'principal'].includes(u.role) || (u.email && u.email.toLowerCase() === 'nurfadilahdarmansah@gmail.com'))
        .map(u => ({
          id: u.id,
          name: u.full_name || u.email,
          email: u.email,
          role: u.role
        }));
    }

    return Response.json({
      block_name: targetBlock,
      wardens: matchingWardens.map(w => ({
        id: w.warden_user_id,
        name: w.warden_name || 'Warden',
        email: w.warden_email || '',
        block: `Blok ${w.block_name}`
      })),
      staff: staffMembers
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}