const express = require('express');
const router = express.Router();
const { auth, authorize, requireSuperAdmin, requireAdminTotp } = require('../middleware/auth.middleware');
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  listBlogsAdmin,
  getBlogByIdAdmin,
  createBlogAdmin,
  updateBlogAdmin,
  deleteBlogAdmin,
  pendingAdminRequests,
  approveAdmin,
  rejectAdmin,
  updateUserRole,
  getAdminStats,
} = require('../controllers/admin.Controller');

router.use(auth, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.delete('/users/:id', requireAdminTotp, deleteUser);
router.post('/users', requireSuperAdmin, createUser);
router.put('/users/:id', requireSuperAdmin, requireAdminTotp, updateUser);
router.get('/pending-admins', pendingAdminRequests);
router.patch('/users/:id/approve-admin', requireSuperAdmin, requireAdminTotp, approveAdmin);
router.patch('/users/:id/reject-admin', requireSuperAdmin, requireAdminTotp, rejectAdmin);
router.patch('/users/:id/role', requireSuperAdmin, requireAdminTotp, updateUserRole);
router.get('/blogs', listBlogsAdmin);
router.get('/blogs/:id', getBlogByIdAdmin);
router.delete('/blogs/:id', requireAdminTotp, deleteBlogAdmin);
router.post('/blogs', requireSuperAdmin, createBlogAdmin);
router.put('/blogs/:id', requireSuperAdmin, requireAdminTotp, updateBlogAdmin);

module.exports = router;
