import { useState } from 'react';
import { useLocation } from 'wouter';
import { login } from '../../api/auth.js';
import { getApiError } from '../../api/client.js';
import { useToast } from '../../components/common/Toast.jsx';
import BubbleBackground from '../../components/BubbleBackground.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { Shield, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'user' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    if (!['user', 'admin'].includes(form.role)) e.role = 'Select a valid role';
    return e;
  };

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const data = await login({ email: form.email, password: form.password, role: form.role });
      if (data.mfaRequired) {
        localStorage.setItem('sw_mfa_token', data.mfaToken);
        addToast('Check your email for the OTP code', 'info');
        setLocation('/verify-otp');
      } else {
        addToast('Logged in!', 'success');
        setLocation('/dashboard');
      }
    } catch (err) {
      const message = getApiError(err);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center relative overflow-hidden p-4">
      <BubbleBackground intensity={0.7} />

      <div className="relative z-10 w-full max-w-md">
        <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </button>

        <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-orange mx-auto flex items-center justify-center mb-4 shadow-lg animate-pulse-glow">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your ShieldWrite account</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={handle}
              placeholder="jane@example.com"
              error={errors.email}
              autoComplete="email"
              autoFocus
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handle}
              placeholder="Your password"
              error={errors.password}
              autoComplete="current-password"
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handle}
                className="input-field w-full px-4 py-3 text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
            </div>

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            New to ShieldWrite?{' '}
            <button onClick={() => setLocation('/signup')} className="text-primary font-medium hover:underline">
              Create account
            </button>
          </p>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3 text-accent" />
          Secured with MFA & encrypted tokens
        </p>
      </div>
    </div>
  );
}
