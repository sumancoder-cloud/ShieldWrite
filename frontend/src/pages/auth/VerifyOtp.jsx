import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { verifyOtp } from '../../api/auth.js';
import { getApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import BubbleBackground from '../../components/BubbleBackground.jsx';
import Button from '../../components/common/Button.jsx';
import { Shield, ArrowLeft, Mail } from 'lucide-react';

export default function VerifyOtp() {
  const [, setLocation] = useLocation();
  const { saveSession } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!localStorage.getItem('sw_mfa_token')) {
      setLocation('/login');
    }
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d) && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code) => {
    const mfaToken = localStorage.getItem('sw_mfa_token');
    if (!mfaToken || !code || code.length < 6) return;
    setLoading(true);
    try {
      const data = await verifyOtp({ mfaToken, otp: code });
      localStorage.removeItem('sw_mfa_token');
      saveSession({ user: data.user });
      addToast('Verified! Welcome back.', 'success');
      setLocation('/dashboard');
    } catch (err) {
      addToast(getApiError(err), 'error');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const submitManual = (e) => {
    e.preventDefault();
    handleVerify(otp.join(''));
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center relative overflow-hidden p-4">
      <BubbleBackground intensity={0.6} />

      <div className="relative z-10 w-full max-w-md">
        <button onClick={() => setLocation('/login')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to login
        </button>

        <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 mx-auto flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code. Enter it below to verify.
            </p>
          </div>

          <form onSubmit={submitManual} className="space-y-6">
            {/* OTP inputs */}
            <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`
                    w-12 h-14 text-center text-xl font-bold input-field rounded-xl
                    ${digit ? 'border-primary/60 text-primary' : ''}
                    transition-all duration-200
                  `}
                  disabled={loading}
                />
              ))}
            </div>

            <Button
              type="submit"
              loading={loading}
              disabled={otp.join('').length < 6}
              size="lg"
              className="w-full"
            >
              Verify OTP
              <Shield className="w-4 h-4" />
            </Button>
          </form>

          <div className="flex items-center justify-center mt-5">
            <p className="text-xs text-muted-foreground text-center">
              Didn't receive the code?{' '}
              <button onClick={() => setLocation('/login')} className="text-primary hover:underline font-medium">
                Try logging in again
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
