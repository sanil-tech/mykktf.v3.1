import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  // ---------------------------
  // APP STATE CHECK
  // ---------------------------
  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(
          `/prod/public-settings/by-id/${appParams.appId}`
        );

        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }

        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;

          setAuthError({
            type: reason,
            message:
              reason === 'auth_required'
                ? 'Authentication required'
                : reason === 'user_not_registered'
                ? 'User not registered for this app'
                : appError.message
          });
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }

        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);

      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });

      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  // ---------------------------
  // USER AUTH CHECK
  // ---------------------------
  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);

      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);

      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);

      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  // ---------------------------
  // 🔥 FIXED: REFRESH USER
  // ---------------------------
  const refreshUser = async () => {
    try {
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // ---------------------------
  // LOGOUT
  // ---------------------------
  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  // ---------------------------
  // LOGIN REDIRECT
  // ---------------------------
  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  // ---------------------------
  // PROVIDER
  // ---------------------------
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        refreshUser // ✅ FIXED
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ---------------------------
// HOOK
// ---------------------------
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};