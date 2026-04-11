import client from './client';

export const addComment = (blogId, data) =>
  client.post(`/api/comments/blog/${blogId}`, data).then((r) => r.data);

export const getComments = (blogId) =>
  client.get(`/api/comments/blog/${blogId}`).then((r) => r.data);

export const deleteComment = (id) =>
  client.delete(`/api/comments/${id}`).then((r) => r.data);
