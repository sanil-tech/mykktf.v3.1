import { createClient } from '@base44/sdk';
import { appParams } from '../lib/app-params.js';

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
      const isSanil = 
        realUser?.email?.toLowerCase() === 'sanil@ums.edu.my' ||
        realUser?.real_email?.toLowerCase() === 'sanil@ums.edu.my';

      if (!isSanil) {
        return realUser;
      }

      const personaOverride = localStorage.getItem('mykktf_active_persona');
      const personaBlock = localStorage.getItem('mykktf_felo_assigned_block') || localStorage.getItem('mykktf_persona_block') || '';

      if (personaOverride) {
        if (personaOverride === 'warden') {
          return {
            ...realUser,
            real_role: realUser.real_role || realUser.role,
            role: 'warden',
            effectiveRole: 'warden',
            is_persona_switched: true,
            active_persona: 'warden',
            active_warden_block: personaBlock
          };
        } else if (personaOverride === 'super_admin') {
          return {
            ...realUser,
            real_role: realUser.real_role || realUser.role,
            role: 'super_admin',
            effectiveRole: 'super_admin',
            is_persona_switched: true,
            active_persona: 'super_admin'
          };
        }
      }
    } catch (e) {}

    return realUser;
  };

  const originalLogout = base44.auth.logout ? base44.auth.logout.bind(base44.auth) : () => {};
  base44.auth.logout = (redirectUrl) => {
    try {
      localStorage.removeItem('mykktf_mapek_guest');
      localStorage.removeItem('mykktf_active_persona');
      localStorage.removeItem('mykktf_felo_assigned_block');
      localStorage.removeItem('mykktf_persona_block');
    } catch (e) {}
    return originalLogout(redirectUrl);
  };
}

