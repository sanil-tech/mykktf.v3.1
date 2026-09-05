import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// MAPEK Guest Showcase & Role Persona Switcher Interceptor
if (typeof window !== 'undefined' && base44?.auth) {
  const originalMe = base44.auth.me ? base44.auth.me.bind(base44.auth) : async () => null;
  base44.auth.me = async () => {
    try {
      const guestJson = localStorage.getItem('mykktf_mapek_guest');
      if (guestJson) {
        return JSON.parse(guestJson);
      }
    } catch (e) {}

    const realUser = await originalMe();
    if (!realUser) return null;

    try {
      const isPrivilegedAdmin = 
        realUser.role === 'super_admin' || 
        realUser.role === 'college_admin' ||
        realUser.real_role === 'super_admin' ||
        realUser.real_role === 'college_admin';

      const personaOverride = localStorage.getItem('mykktf_active_persona');
      const personaBlock = localStorage.getItem('mykktf_persona_block') || 'Block B';

      if (isPrivilegedAdmin && personaOverride === 'warden') {
        return {
          ...realUser,
          real_role: realUser.real_role || realUser.role,
          role: 'warden',
          effectiveRole: 'warden',
          is_persona_switched: true,
          active_persona: 'warden',
          active_warden_block: personaBlock
        };
      }
    } catch (e) {}

    return realUser;
  };

  const originalLogout = base44.auth.logout ? base44.auth.logout.bind(base44.auth) : () => {};
  base44.auth.logout = (redirectUrl) => {
    try {
      localStorage.removeItem('mykktf_mapek_guest');
      localStorage.removeItem('mykktf_active_persona');
      localStorage.removeItem('mykktf_persona_block');
    } catch (e) {}
    return originalLogout(redirectUrl);
  };
}

// Intercept WardenBlock query when active persona is set to warden
if (typeof window !== 'undefined' && base44?.entities?.WardenBlock) {
  const originalWbFilter = base44.entities.WardenBlock.filter.bind(base44.entities.WardenBlock);
  base44.entities.WardenBlock.filter = async (query = {}, sort, limit) => {
    let results = await originalWbFilter(query, sort, limit);
    try {
      const personaOverride = localStorage.getItem('mykktf_active_persona');
      const personaBlock = localStorage.getItem('mykktf_persona_block') || 'Block B';
      if (personaOverride === 'warden' && personaBlock) {
        if (!Array.isArray(results)) results = [];
        const hasBlock = results.some(r => r.block_name === personaBlock);
        if (!hasBlock) {
          results.push({
            id: 'sim_persona_wb_' + personaBlock,
            warden_user_id: query?.warden_user_id || 'active_warden',
            block_name: personaBlock,
            assigned_at: new Date().toISOString()
          });
        }
      }
    } catch (e) {}
    return results;
  };
}

