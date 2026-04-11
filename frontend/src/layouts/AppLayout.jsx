import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/common/Toast.jsx';
import {
  LayoutDashboard, FileText, PlusCircle, User, LogOut, LogIn,
  Shield, Menu, X, ChevronRight, Settings
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'All Blogs', href: '/blogs', icon: FileText },
  { label: 'Write Blog', href: '/blogs/new', icon: PlusCircle },
  { label: 'Admin', href: '/admin', icon: Settings, adminOnly: true },
  { label: 'Profile', href: '/profile', icon: User },
];

export default function AppLayout({ children }) {
  const { user, logout, logoutAll } = useAuth();
  const { addToast } = useToast();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    addToast('Logged out successfully', 'success');
    setLocation('/login');
    setLoggingOut(false);
  };

  const handleLogoutAll = async () => {
    setLoggingOut(true);
    await logoutAll();
    addToast('Logged out from all devices', 'success');
    setLocation('/login');
    setLoggingOut(false);
  };

  const isActive = (href) => location === href || location.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-40
          glass border-r border-border/60
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50">
          <div className="w-9 h-9 rounded-xl gradient-orange flex items-center justify-center shadow-lg animate-pulse-glow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-foreground tracking-tight">ShieldWrite</span>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">Secure Blogging</p>
          </div>
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.filter((item)=>!item.adminOnly || user?.role==='admin').map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => { setLocation(item.href); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 group relative
                  ${active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary/60" />}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-border/50 space-y-2">
          {user && (
            <div className="px-4 py-3 rounded-xl bg-muted/40 flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.role || 'Member'}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          <button
            onClick={handleLogoutAll}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-red-400 hover:bg-destructive/10 transition-all"
          >
            <LogIn className="w-4 h-4 rotate-180" />
            Logout All Devices
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 glass border-b border-border/50 px-4 lg:px-8 h-14 flex items-center justify-between">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            <span>ShieldWrite</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">
              {navItems.find((n) => isActive(n.href))?.label || 'Page'}
            </span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setLocation('/blogs/new')}
              className="btn-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Blog</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
