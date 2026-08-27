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

    let sp = await base44.entities.Student.filter({ user_id: user.id });
    if (!sp.length) sp = await base44.entities.Student.filter({ email: user.email });
    const s = sp[0];

    if (!s || !s.block_name) {
      return Response.json({
        wardens: [],
        block_name: null,
        message: 'Blok kediaman belum ditetapkan untuk profil anda.'
      });
    }

    const wardens = await base44.asServiceRole.entities.WardenBlock.filter({ block_name: s.block_name });

    return Response.json({
      block_name: s.block_name,
      wardens: wardens.map(w => ({
        id: w.warden_user_id,
        name: w.warden_name || 'Warden',
        block: `Blok ${w.block_name}`
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}