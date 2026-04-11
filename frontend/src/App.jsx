import { Switch, Route, Router as WouterRouter } from 'wouter';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import { AuthGuard, GuestGuard } from './components/AuthGuard.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';
import VerifyOtp from './pages/auth/VerifyOtp.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BlogList from './pages/blogs/BlogList.jsx';
import BlogDetail from './pages/blogs/BlogDetail.jsx';
import BlogCreate from './pages/blogs/BlogCreate.jsx';
import BlogEdit from './pages/blogs/BlogEdit.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';
import AppLayout from './layouts/AppLayout.jsx';

const base = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

function PrivatePage({ children }) {
  return <AuthGuard><AppLayout>{children}</AppLayout></AuthGuard>;
}

function PublicPage({ children }) {
  return <GuestGuard>{children}</GuestGuard>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login">
        <PublicPage><Login /></PublicPage>
      </Route>
      <Route path="/signup">
        <PublicPage><Signup /></PublicPage>
      </Route>
      <Route path="/verify-otp">
        <VerifyOtp />
      </Route>
      <Route path="/dashboard">
        <PrivatePage><Dashboard /></PrivatePage>
      </Route>
      <Route path="/blogs">
        <PrivatePage><BlogList /></PrivatePage>
      </Route>
      <Route path="/blogs/new">
        <PrivatePage><BlogCreate /></PrivatePage>
      </Route>
      <Route path="/blogs/:id/edit">
        {(params) => <PrivatePage><BlogEdit id={params.id} /></PrivatePage>}
      </Route>
      <Route path="/blogs/:id">
        {(params) => <PrivatePage><BlogDetail id={params.id} /></PrivatePage>}
      </Route>
      <Route path="/profile">
        <PrivatePage><Profile /></PrivatePage>
      </Route>
      <Route path="/admin">
        <PrivatePage><AdminDashboard /></PrivatePage>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WouterRouter base={base}>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
