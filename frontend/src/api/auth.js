import client from './client';

export const signup = (data) =>
  client.post('/api/auth/signup', data).then((r) => r.data);

export const login = (data) =>
  client.post('/api/auth/login', data).then((r) => r.data);

export const verifyOtp = (data) =>
  client.post('/api/auth/verify-otp', data).then((r) => r.data);

export const verifyEmail = (token) =>
  client.post('/api/auth/verify-email', { token }).then((r) => r.data);

export const resendVerification = (email) =>
  client.post('/api/auth/resend-verification', { email }).then((r) => r.data);

export const refreshToken = (data) =>
  client.post('/api/auth/refresh-token', data).then((r) => r.data);

export const logout = (data) =>
  client.post('/api/auth/logout', data || {}).then((r) => r.data);

export const logoutAll = () =>
  client.post('/api/auth/logout-all').then((r) => r.data);

export const getMe = () =>
  client.get('/api/auth/me').then((r) => r.data);

export const getAdminMfaStatus = () =>
  client.get('/api/auth/admin-mfa/status').then((r) => r.data);

export const setupAdminMfa = () =>
  client.post('/api/auth/admin-mfa/setup').then((r) => r.data);

export const enableAdminMfa = (token) =>
  client.post('/api/auth/admin-mfa/enable', { token }).then((r) => r.data);

export const disableAdminMfa = (token) =>
  client.post('/api/auth/admin-mfa/disable', { token }).then((r) => r.data);
