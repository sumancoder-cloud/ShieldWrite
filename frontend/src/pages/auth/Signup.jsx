import { useState } from 'react';
import { useLocation } from 'wouter';
import { signup } from '../../api/auth.js';
import { getApiError } from '../../api/client.js';
import { useToast } from '../../components/common/Toast.jsx';
import BubbleBackground from '../../components/BubbleBackground.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { Shield, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Signup() {
  const [, setLocation] = useLocation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', age: '', role: 'user' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 12) e.password = 'Password must be at least 12 characters';
    else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      e.password = 'Use uppercase, lowercase, number and special character';
    }
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.age) e.age = 'Age is required';
    else if (isNaN(form.age) || form.age < 13) e.age = 'Must be at least 13';
    if (!['user', 'admin'].includes(form.role)) e.role = 'Choose a valid role';
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
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
      };
      if (form.age) payload.age = Number(form.age);
      const data = await signup(payload);
      addToast(data?.message || 'Account created! Please log in.', 'success');
      setLocation('/login');
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center relative overflow-hidden p-4">
      <BubbleBackground intensity={0.7} />

      <div className="relative z-10 w-full max-w-md">
        {/* Back to landing */}
        <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </button>

        <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-orange mx-auto flex items-center justify-center mb-4 shadow-lg animate-pulse-glow">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
            <p className="text-sm text-muted-foreground">Join ShieldWrite and start writing securely</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" name="firstName" value={form.firstName} onChange={handle} placeholder="Jane" error={errors.firstName} autoComplete="given-name" />
              <Input label="Last Name" name="lastName" value={form.lastName} onChange={handle} placeholder="Doe" error={errors.lastName} autoComplete="family-name" />
            </div>
            <Input label="Email" name="email" type="email" value={form.email} onChange={handle} placeholder="jane@example.com" error={errors.email} autoComplete="email" />
            <Input label="Age" name="age" type="number" value={form.age} onChange={handle} placeholder="25" error={errors.age} min="13" />
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handle}
                className="input-field w-full px-4 py-3 text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin (requires approval)</option>
              </select>
              {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
            </div>
            <Input label="Password" name="password" type="password" value={form.password} onChange={handle} placeholder="Min 12 chars + A/a/0/@" error={errors.password} autoComplete="new-password" hint="12+ chars with uppercase, lowercase, number, special" />
            <Input label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handle} placeholder="Re-enter password" error={errors.confirmPassword} autoComplete="new-password" />

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <button onClick={() => setLocation('/login')} className="text-primary font-medium hover:underline">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
