import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useAuthHandlers = () => {
  const { handleUserRegister, handleUserLogin } = useAuth();

  // Authentication form submission handler
  const handleUserAuthSubmit = useCallback(async (mode, formData, onSuccess = null) => {
    try {
      if (mode === 'register') {
        const { email, password, confirmPassword, firstName, lastName, phone } = formData;

        // Validation
        if (!password || !firstName || !lastName) {
          return { success: false, error: 'Missing required fields' };
        }

        if (!email && !phone) {
          return { success: false, error: 'Email or phone required' };
        }

        if (password !== confirmPassword) {
          return { success: false, error: 'Passwords do not match' };
        }

        if (password.length < 6) {
          return { success: false, error: 'Password too short' };
        }

        // Register user
        const result = await handleUserRegister({ email, password, firstName, lastName, phone });

        if (result.success) {
          // Auto-login after successful registration using email or phone
          const username = email || phone;
          const loginResult = await handleUserLogin(username, password);

          if (loginResult.success) {
            onSuccess && onSuccess();
            return { success: true };
          } else {
            return { success: true, requiresManualLogin: true };
          }
        } else {
          return { success: false, error: result.error };
        }
      } else {
        // Login mode
        const { username, password } = formData;

        if (!username || !password) {
          return { success: false, error: 'Missing credentials' };
        }

        const result = await handleUserLogin(username, password);

        if (result.success) {
          onSuccess && onSuccess();
          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [handleUserRegister, handleUserLogin]);

  return {
    handleUserAuthSubmit
  };
};