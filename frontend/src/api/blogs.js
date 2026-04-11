import client from './client';

export const createBlog = (data) =>
  client.post('/api/blogs', data).then((r) => r.data);

export const getBlogs = (params) =>
  client.get('/api/blogs', { params }).then((r) => r.data);

export const getBlog = (id) =>
  client.get(`/api/blogs/${id}`).then((r) => r.data);

export const updateBlog = (id, data, adminTotp) =>
  client.put(`/api/blogs/${id}`, data, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);

export const deleteBlog = (id, adminTotp) =>
  client.delete(`/api/blogs/${id}`, {
    headers: adminTotp ? { 'x-admin-totp': String(adminTotp) } : undefined,
  }).then((r) => r.data);

export const likeBlog = (id) =>
  client.patch(`/api/blogs/${id}/like`).then((r) => r.data);
