import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import BubbleBackground from '../components/BubbleBackground.jsx';
import { Shield, Zap, Lock, Users, ArrowRight, CheckCircle, Star, Menu, X } from 'lucide-react';

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const handler = () => setY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return y;
}

function useInView(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function FadeSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const visible = useInView(ref);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const features = [
  { icon: Lock, title: 'MFA Security', desc: 'Two-factor authentication via OTP to keep your account fortress-grade secure.', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { icon: Zap, title: 'Blazing Fast', desc: 'React-powered frontend with token refresh, so your reading experience never skips a beat.', color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
  { icon: Users, title: 'Community Blogs', desc: 'Write, like, and comment on articles. Admin and member roles with smart permissions.', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: Shield, title: 'Token-First Auth', desc: 'Seamless JWT + refresh token flow with auto-retry on expiry. Stay logged in, stay safe.', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
];

const testimonials = [
  { name: 'Tati Suman Yadav', role: 'Computer Science Student, SRM AP', quote: 'ShieldWrite keeps our writing secure and collaborative. We built and trust it for daily publishing.', rating: 5 },
  { name: 'P Mohan Chandu', role: 'Computer Science Student, SRM AP', quote: 'Authentication and admin controls feel production-ready while still being easy to use.', rating: 5 },
  { name: 'Bendalem Charan', role: 'Computer Science Student, SRM AP', quote: 'The secure auth flow and moderation tools make this platform strong for real student communities.', rating: 5 },
];

const formatCount = (value) => {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K+`;
  return `${n}`;
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const scrollY = useScrollY();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState([
    { value: '0', label: 'Writers' },
    { value: '0', label: 'Articles' },
    { value: '0', label: 'Comments' },
    { value: '0', label: 'Admins' },
  ]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/public/stats');
        const data = await response.json();
        if (!response.ok || !data?.success) return;

        setStats([
          { value: formatCount(data.stats?.writers), label: 'Writers' },
          { value: formatCount(data.stats?.articles), label: 'Articles' },
          { value: formatCount(data.stats?.comments), label: 'Comments' },
          { value: formatCount(data.stats?.admins), label: 'Admins' },
        ]);
      } catch (_) {}
    };

    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <BubbleBackground intensity={1} />

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollY > 30 ? 'glass border-b border-border/40 py-3' : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-orange flex items-center justify-center shadow-lg animate-pulse-glow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">ShieldWrite</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Testimonials', 'Stats'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="nav-link text-sm">
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setLocation('/login')}
              className="btn-secondary px-5 py-2 text-sm rounded-xl font-medium"
            >
              Log In
            </button>
            <button
              onClick={() => setLocation('/signup')}
              className="btn-primary px-5 py-2 text-sm rounded-xl"
            >
              Get Started
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-foreground p-2 rounded-lg hover:bg-muted/60"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-border/40 px-4 py-4 space-y-3">
            {['Features', 'Testimonials', 'Stats'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="block text-sm text-muted-foreground hover:text-foreground py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setLocation('/login')} className="btn-secondary flex-1 py-2.5 text-sm rounded-xl">Log In</button>
              <button onClick={() => setLocation('/signup')} className="btn-primary flex-1 py-2.5 text-sm rounded-xl">Sign Up</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-20">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />

        {/* Decorative blobs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-accent/8 blur-3xl animate-blob pointer-events-none" style={{ animationDelay: '3s' }} />

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 glass border border-primary/30 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Now live — ShieldWrite v2.0</span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up delay-100 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-[1.05] mb-6">
            Write. Shield.{' '}
            <span className="text-gradient-orange block">Inspire.</span>
          </h1>

          <p className="animate-fade-up delay-200 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            The blogging platform built for people who take their words — and their security — seriously.
            MFA, token-refresh auth, and a beautiful editor in one place.
          </p>

          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setLocation('/signup')}
              className="btn-primary px-8 py-4 text-base rounded-2xl flex items-center gap-2.5 group w-full sm:w-auto"
            >
              Start Writing Free
              <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setLocation('/login')}
              className="btn-secondary px-8 py-4 text-base rounded-2xl w-full sm:w-auto"
            >
              Sign In
            </button>
          </div>

          {/* Trust line */}
          <div className="animate-fade-up delay-400 mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['No credit card needed', 'MFA protected', 'Cancel anytime'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-accent" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-5 h-8 rounded-full border-2 border-muted-foreground/40 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-muted-foreground/60 animate-float-slow" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <FadeSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className="glass rounded-2xl p-6 text-center border border-border/50 card-hover"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="text-3xl sm:text-4xl font-bold text-gradient-orange mb-1">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeSection>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeSection className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">Why ShieldWrite</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Built with{' '}
              <span className="text-gradient-green">care & craft</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need to write, secure, and connect — nothing you don't.
            </p>
          </FadeSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeSection key={f.title} delay={i * 100}>
                  <div className={`glass rounded-2xl p-6 border ${f.border} card-hover h-full`}>
                    <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-5`}>
                      <Icon className={`w-6 h-6 ${f.color}`} />
                    </div>
                    <h3 className="font-bold text-foreground text-lg mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </FadeSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <FadeSection>
            <div className="relative rounded-3xl overflow-hidden p-10 md:p-14 text-center">
              <div className="absolute inset-0 gradient-orange opacity-90" />
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, white 0%, transparent 60%)' }} />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to write with confidence?</h2>
                <p className="text-orange-100 text-lg mb-8 max-w-xl mx-auto">
                  Join thousands of writers who trust ShieldWrite to protect their words.
                </p>
                <button
                  onClick={() => setLocation('/signup')}
                  className="bg-white text-primary font-bold px-8 py-4 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-2"
                >
                  Create Free Account
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeSection className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent mb-3 block">Loved by Writers</span>
            <h2 className="text-4xl font-bold text-foreground">Real stories, real impact</h2>
          </FadeSection>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <FadeSection key={t.name} delay={i * 100}>
                <div className="glass rounded-2xl p-7 border border-border/50 card-hover h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, k) => (
                      <Star key={k} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-foreground/80 text-sm leading-relaxed flex-1 mb-5 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gradient-orange flex items-center justify-center text-white text-sm font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-orange flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">ShieldWrite</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 ShieldWrite. All rights reserved.</p>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
