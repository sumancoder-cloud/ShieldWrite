import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { getApiError } from '../../api/client.js';
import {
  getAdminStats,
  getUsers,
  getPendingAdmins,
  approveAdmin,
  rejectAdmin,
  updateUserRole,
  deleteAdminUser,
  getAdminBlogs,
  deleteAdminBlog,
  createAdminUser,
} from '../../api/admin.js';
import { ShieldCheck, Users, FileText, MessageCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({ users: 0, blogs: 0, comments: 0, pendingAdmins: 0 });
  const [users, setUsers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    age: '',
    email: '',
    password: '',
    role: 'user',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, pendingData, blogsData] = await Promise.all([
        getAdminStats(),
        getUsers(),
        getPendingAdmins(),
        getAdminBlogs(),
      ]);
      setStats(statsData.stats || {});
      setUsers(usersData.users || []);
      setPendingAdmins(pendingData.users || []);
      setBlogs(blogsData.blogs || []);
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onApprove = async (id) => {
    const adminTotp = prompt('Enter Google Authenticator code to approve admin');
    if (!adminTotp) return;
    try {
      await approveAdmin(id, adminTotp);
      addToast('Admin approved', 'success');
      fetchAll();
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  const onReject = async (id) => {
    const adminTotp = prompt('Enter Google Authenticator code to reject admin request');
    if (!adminTotp) return;
    try {
      await rejectAdmin(id, adminTotp);
      addToast('Admin request rejected', 'success');
      fetchAll();
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  const onRoleChange = async (targetUser, role) => {
    const adminTotp = prompt('Enter Google Authenticator code to change role');
    if (!adminTotp) return;
    try {
      await updateUserRole(targetUser._id || targetUser.id, role, adminTotp);
      addToast('Role updated', 'success');
      fetchAll();
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  const onDeleteUser = async (targetUser) => {
    if (!confirm(`Delete user ${targetUser.email}? This also removes their blogs/comments.`)) return;
    const adminTotp = prompt('Enter Google Authenticator code to delete user');
    if (!adminTotp) return;
    try {
      await deleteAdminUser(targetUser._id || targetUser.id, adminTotp);
      addToast('User deleted', 'success');
      fetchAll();
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  const onDeleteBlog = async (blog) => {
    if (!confirm(`Delete blog \"${blog.title}\"?`)) return;
    const adminTotp = prompt('Enter Google Authenticator code to delete blog');
    if (!adminTotp) return;
    try {
      await deleteAdminBlog(blog._id || blog.id, adminTotp);
      addToast('Blog deleted', 'success');
      fetchAll();
    } catch (err) {
      addToast(getApiError(err), 'error');
    }
  };

  const onCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await createAdminUser({
        ...newUserForm,
        age: Number(newUserForm.age),
      });
      addToast('User created by super admin', 'success');
      setNewUserForm({ firstName: '', lastName: '', age: '', email: '', password: '', role: 'user' });
      fetchAll();
    } catch (err) {
      addToast(getApiError(err), 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  if (user?.role !== 'admin') {
    return <p className="text-muted-foreground">Admin access only.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage users, roles, and admin approvals.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Users" value={stats.users || 0} />
        <StatCard icon={FileText} label="Blogs" value={stats.blogs || 0} />
        <StatCard icon={MessageCircle} label="Comments" value={stats.comments || 0} />
        <StatCard icon={ShieldCheck} label="Pending Admins" value={stats.pendingAdmins || 0} />
      </div>

      <section className="glass rounded-2xl border border-border/50 p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">Pending Admin Approvals</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : pendingAdmins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending admin requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingAdmins.map((u) => (
              <div key={u._id || u.id} className="flex items-center justify-between border border-border/40 rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                {user?.isSuperAdmin ? (
                  <div className="flex gap-2">
                    <button className="btn-primary px-3 py-2 rounded-lg" onClick={() => onApprove(u._id || u.id)}>Approve</button>
                    <button className="px-3 py-2 rounded-lg border border-border hover:bg-muted/50" onClick={() => onReject(u._id || u.id)}>Reject</button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Only super admin can approve</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl border border-border/50 p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">All Users</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border/50">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Approval</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id || u.id} className="border-b border-border/30">
                  <td className="py-2">{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td>{u.role}{u.isSuperAdmin ? ' (super)' : ''}</td>
                  <td>{u.adminApproved ? 'Approved' : 'Pending'}</td>
                  <td>
                    <div className="flex gap-2 py-2 flex-wrap">
                      {user?.isSuperAdmin && !u.isSuperAdmin && (
                        <>
                          <button className="px-2 py-1 rounded border border-border hover:bg-muted/50" onClick={() => onRoleChange(u, 'user')}>Make User</button>
                          <button className="px-2 py-1 rounded border border-border hover:bg-muted/50" onClick={() => onRoleChange(u, 'admin')}>Make Admin</button>
                        </>
                      )}
                      {!u.isSuperAdmin && (
                        <button className="px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onDeleteUser(u)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-2xl border border-border/50 p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">All Blogs (Admin Moderation)</h2>
        <div className="space-y-3">
          {blogs.map((b) => (
            <div key={b._id || b.id} className="flex items-center justify-between border border-border/40 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground truncate">{b.author?.email || 'Unknown author'}</p>
              </div>
              <button
                className="px-3 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => onDeleteBlog(b)}
              >
                Delete Blog
              </button>
            </div>
          ))}
          {blogs.length === 0 && <p className="text-sm text-muted-foreground">No blogs found.</p>}
        </div>
      </section>

      {user?.isSuperAdmin && (
        <section className="glass rounded-2xl border border-border/50 p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Create User/Admin (Super Admin)</h2>
          <form onSubmit={onCreateUser} className="grid sm:grid-cols-2 gap-3">
            <input className="input-field px-3 py-2" placeholder="First name" value={newUserForm.firstName} onChange={(e) => setNewUserForm((p) => ({ ...p, firstName: e.target.value }))} required />
            <input className="input-field px-3 py-2" placeholder="Last name" value={newUserForm.lastName} onChange={(e) => setNewUserForm((p) => ({ ...p, lastName: e.target.value }))} required />
            <input className="input-field px-3 py-2" placeholder="Age" type="number" min="13" value={newUserForm.age} onChange={(e) => setNewUserForm((p) => ({ ...p, age: e.target.value }))} required />
            <select className="input-field px-3 py-2" value={newUserForm.role} onChange={(e) => setNewUserForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <input className="input-field px-3 py-2 sm:col-span-2" placeholder="Email" type="email" value={newUserForm.email} onChange={(e) => setNewUserForm((p) => ({ ...p, email: e.target.value }))} required />
            <input className="input-field px-3 py-2 sm:col-span-2" placeholder="Password (12+ with A/a/0/@)" type="password" minLength="12" value={newUserForm.password} onChange={(e) => setNewUserForm((p) => ({ ...p, password: e.target.value }))} required />
            <div className="sm:col-span-2">
              <button className="btn-primary px-4 py-2 rounded-lg" disabled={creatingUser} type="submit">{creatingUser ? 'Creating...' : 'Create Account'}</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="glass rounded-xl border border-border/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
    </div>
  );
}
