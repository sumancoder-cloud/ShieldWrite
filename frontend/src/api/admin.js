import client from './client';

export const getAdminStats = () =>
  client.get('/api/admin/stats').then((r) => r.data);

export const getUsers = () =>
  client.get('/api/admin/users').then((r) => r.data);

export const createAdminUser = (data) =>
  client.post('/api/admin/users', data).then((r) => r.data);

export const updateAdminUser = (id, data, adminTotp) =>
  client.put(`/api/admin/users/${id}`, data, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);

export const deleteAdminUser = (id, adminTotp) =>
  client.delete(`/api/admin/users/${id}`, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);

export const getPendingAdmins = () =>
  client.get('/api/admin/pending-admins').then((r) => r.data);

export const approveAdmin = (id, adminTotp) =>
  client.patch(`/api/admin/users/${id}/approve-admin`, null, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);

export const rejectAdmin = (id, adminTotp) =>
  client.patch(`/api/admin/users/${id}/reject-admin`, null, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);

export const updateUserRole = (id, role, adminTotp) =>
  client.patch(`/api/admin/users/${id}/role`, { role }, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);

export const getAdminBlogs = () =>
  client.get('/api/admin/blogs').then((r) => r.data);

export const deleteAdminBlog = (id, adminTotp) =>
  client.delete(`/api/admin/blogs/${id}`, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);

export const createAdminBlog = (data) =>
  client.post('/api/admin/blogs', data).then((r) => r.data);

export const updateAdminBlog = (id, data, adminTotp) =>
  client.put(`/api/admin/blogs/${id}`, data, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);
