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

// MAPEK Guest Showcase Interceptor: Allows temporary simulation of Pengetua role without breaking real Base44 SDK calls
if (typeof window !== 'undefined' && base44?.auth) {
  const originalMe = base44.auth.me ? base44.auth.me.bind(base44.auth) : async () => null;
  base44.auth.me = async () => {
    try {
      const guestJson = localStorage.getItem('mykktf_mapek_guest');
      if (guestJson) {
        return JSON.parse(guestJson);
      }
    } catch (e) {}
    return originalMe();
  };

  const originalLogout = base44.auth.logout ? base44.auth.logout.bind(base44.auth) : () => {};
  base44.auth.logout = (redirectUrl) => {
    try {
      localStorage.removeItem('mykktf_mapek_guest');
    } catch (e) {}
    return originalLogout(redirectUrl);
  };
}
