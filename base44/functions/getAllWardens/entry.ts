import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns all users with the 'warden' role, for the Block Assignment admin UI.
// Runs as service role because the built-in User entity only allows the literal
// 'admin' role to list users — college_admin would otherwise be denied.
// Restricted to admin roles (super_admin / college_admin) at the call boundary.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const adminRoles = ['super_admin', 'college_admin'];
    if (!adminRoles.includes(user.role)) {
      return Response.json({ error: 'Permission denied' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const wardens = users
      .filter(u => u.role === 'warden')
      .map(u => ({
        id: u.id,
        full_name: u.full_name || '',
        email: u.email || '',
        role: u.role,
      }));

    return Response.json({ wardens });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}