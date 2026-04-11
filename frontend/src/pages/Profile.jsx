import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { useLocation } from 'wouter';
import { getApiError } from '../api/client.js';
import { getAdminMfaStatus, setupAdminMfa, enableAdminMfa, disableAdminMfa } from '../api/auth.js';
import Button from '../components/common/Button.jsx';
import { User, Mail, Shield, LogOut, LogIn, Calendar } from 'lucide-react';
import { getInitials } from '../lib/utils.js';

export default function Profile() {
  const { user, logout, logoutAll } = useAuth();
  const { addToast } = useToast();
  const [, setLocation] = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [adminMfaEnabled, setAdminMfaEnabled] = useState(!!user?.adminMfaEnabled);
  const [mfaSetup, setMfaSetup] = useState(null);

  const refreshMfaStatus = async () => {
    if (user?.role !== 'admin') return;
    try {
      const data = await getAdminMfaStatus();
      setAdminMfaEnabled(!!data.adminMfaEnabled);
    } catch (_) {}
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    addToast('Logged out successfully', 'success');
    setLocation('/login');
  };

  const handleLogoutAll = async () => {
    setLoggingOut(true);
    await logoutAll();
    addToast('Logged out from all devices', 'success');
    setLocation('/login');
  };

  const handleMfaSetup = async () => {
    setMfaLoading(true);
    try {
      const data = await setupAdminMfa();
      setMfaSetup(data);
      addToast('Scan QR and enter TOTP to enable.', 'info');
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaEnable = async () => {
    const token = prompt('Enter 6-digit code from Google Authenticator');
    if (!token) return;
    setMfaLoading(true);
    try {
      await enableAdminMfa(token);
      setMfaSetup(null);
      await refreshMfaStatus();
      addToast('Google Authenticator enabled.', 'success');
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaDisable = async () => {
    const token = prompt('Enter current 6-digit Google Authenticator code to disable');
    if (!token) return;
    setMfaLoading(true);
    try {
      await disableAdminMfa(token);
      await refreshMfaStatus();
      addToast('Google Authenticator disabled.', 'success');
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : 'User';

  useEffect(() => {
    refreshMfaStatus();
  }, [user?.role]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>

      {/* Avatar card */}
      <div className="glass rounded-2xl p-8 border border-border/50 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-2xl gradient-orange flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-lg animate-pulse-glow">
          {getInitials(displayName)}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-foreground mb-1">{displayName}</h2>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            user?.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'
          }`}>
            <Shield className="w-3 h-3" />
            {user?.role === 'admin' ? 'Administrator' : 'Member'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="glass rounded-2xl border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40">
          <h3 className="font-semibold text-foreground">Account Details</h3>
        </div>
        <div className="divide-y divide-border/40">
          {[
            { icon: User, label: 'Full Name', value: displayName },
            { icon: Mail, label: 'Email Address', value: user?.email || '—' },
            { icon: Shield, label: 'Role', value: user?.role || 'member' },
            { icon: Calendar, label: 'Age', value: user?.age || '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="glass rounded-2xl p-6 border border-border/50 space-y-3">
        <h3 className="font-semibold text-foreground mb-4">Session Management</h3>
        <Button
          onClick={handleLogout}
          loading={loggingOut}
          variant="secondary"
          className="w-full justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout from this device
        </Button>
        <Button
          onClick={handleLogoutAll}
          loading={loggingOut}
          variant="danger"
          className="w-full justify-center gap-2"
        >
          <LogIn className="w-4 h-4 rotate-180" />
          Logout from all devices
        </Button>
      </div>

      {user?.role === 'admin' && (
        <div className="glass rounded-2xl p-6 border border-border/50 space-y-3">
          <h3 className="font-semibold text-foreground mb-2">Google Authenticator (Admin Actions)</h3>
          <p className="text-sm text-muted-foreground">
            Required for admin/superadmin update and delete operations.
          </p>
          <p className="text-sm">
            Status: <span className={adminMfaEnabled ? 'text-accent' : 'text-destructive'}>{adminMfaEnabled ? 'Enabled' : 'Disabled'}</span>
          </p>

          {!adminMfaEnabled && (
            <Button onClick={handleMfaSetup} loading={mfaLoading} variant="secondary" className="w-full justify-center">
              Setup Google Authenticator
            </Button>
          )}

          {!adminMfaEnabled && mfaSetup?.qrCodeDataUrl && (
            <div className="rounded-xl border border-border/50 p-4 text-center space-y-2">
              <img src={mfaSetup.qrCodeDataUrl} alt="Google Authenticator QR" className="mx-auto w-48 h-48 rounded-lg" />
              <p className="text-xs text-muted-foreground break-all">Manual key: {mfaSetup.manualKey}</p>
              <Button onClick={handleMfaEnable} loading={mfaLoading} className="w-full justify-center">
                Verify and Enable
              </Button>
            </div>
          )}

          {adminMfaEnabled && (
            <Button onClick={handleMfaDisable} loading={mfaLoading} variant="danger" className="w-full justify-center">
              Disable Google Authenticator
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
