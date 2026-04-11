const argon2 = require('argon2');
const User = require('../models/user.model');
const Blog = require('../models/blog.model');
const Comment = require('../models/comment.model');
const RefreshToken = require('../models/refreshToken.model');
const { sendSecurityAlertEmail } = require('../utils/email');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const SECURITY_ALERT_EMAIL = normalizeEmail(process.env.SECURITY_ALERT_EMAIL || process.env.MAIN_ADMIN_EMAIL || 'suman.tati2005@gmail.com');

const validateStrongPassword = (password = '') => {
  const value = String(password);
  if (value.length < 12) return 'Password must be at least 12 characters long';
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return 'Password must include uppercase, lowercase, number, and special character';
  }
  return null;
};

const sendAdminActionAlert = async ({ req, action, target, details }) => {
  await sendSecurityAlertEmail({
    to: SECURITY_ALERT_EMAIL,
    subject: `ShieldWrite alert: admin action - ${action}`,
    message: `Admin/Superadmin action performed: ${action}`,
    details: `Actor: ${req.user?.email || req.user?.id}\nRole: ${req.user?.role}\nTarget: ${target}\nIP: ${req.ip}\nUser-Agent: ${req.headers['user-agent'] || 'unknown'}\nDetails: ${details || '-'}`,
  });
};

const listUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -adminMfaSecret -adminMfaTempSecret -emailVerificationTokenHash')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -adminMfaSecret -adminMfaTempSecret -emailVerificationTokenHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, age, email, password, role } = req.body;
    if (!firstName || !email || !password || age === undefined) {
      return res.status(400).json({
        success: false,
        message: 'firstName, age, email and password are required',
      });
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const nextRole = role === 'admin' ? 'admin' : 'user';
    const hashedPassword = await argon2.hash(password);

    const user = await User.create({
      firstName: String(firstName).trim(),
      lastName: lastName ? String(lastName).trim() : '',
      age: Number(age),
      email: normalizedEmail,
      password: hashedPassword,
      role: nextRole,
      adminApproved: true,
      isSuperAdmin: false,
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, age, role, adminApproved } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isSuperAdmin) {
      return res.status(400).json({ success: false, message: 'Cannot update super admin using this endpoint' });
    }

    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();
    if (age !== undefined) user.age = Number(age);
    if (role !== undefined && ['user', 'admin'].includes(role)) user.role = role;
    if (adminApproved !== undefined) user.adminApproved = !!adminApproved;

    await user.save();
    await sendAdminActionAlert({ req, action: 'update_user', target: user.email, details: 'User profile/role fields updated' });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const requesterIsSuper = !!req.user?.isSuperAdmin;
    const isSelf = String(target._id) === String(req.user.id);

    if (isSelf) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account from admin panel' });
    }

    if (target.isSuperAdmin && !requesterIsSuper) {
      return res.status(403).json({ success: false, message: 'Only super admin can delete super admin' });
    }

    if (target.role === 'admin' && !requesterIsSuper) {
      return res.status(403).json({ success: false, message: 'Only super admin can delete admin accounts' });
    }

    const ownedBlogs = await Blog.find({ author: target._id }).select('_id');
    const ownedBlogIds = ownedBlogs.map((b) => b._id);

    await Comment.deleteMany({
      $or: [
        { user: target._id },
        { blog: { $in: ownedBlogIds } },
      ],
    });
    await Blog.deleteMany({ author: target._id });
    await RefreshToken.deleteMany({ user: target._id });
    await target.deleteOne();
    await sendAdminActionAlert({ req, action: 'delete_user', target: target.email, details: 'User and associated resources deleted' });

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const listBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: blogs.length,
      blogs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const getBlogByIdAdmin = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'firstName lastName email role');

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    return res.status(200).json({ success: true, blog });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const createBlogAdmin = async (req, res) => {
  try {
    const { title, content, status, authorId } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'title and content are required' });
    }

    const targetAuthorId = authorId || req.user.id;
    const author = await User.findById(targetAuthorId);
    if (!author) {
      return res.status(404).json({ success: false, message: 'Author not found' });
    }

    const blog = await Blog.create({
      title: String(title).trim(),
      content: String(content).trim(),
      status: status === 'published' ? 'published' : 'draft',
      author: author._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      blog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const updateBlogAdmin = async (req, res) => {
  try {
    const { title, content, status } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (title !== undefined) blog.title = String(title).trim();
    if (content !== undefined) blog.content = String(content).trim();
    if (status !== undefined && ['draft', 'published'].includes(status)) {
      blog.status = status;
    }

    await blog.save();
    await sendAdminActionAlert({ req, action: 'update_blog', target: String(blog._id), details: `Title: ${blog.title}` });

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      blog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const deleteBlogAdmin = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    await Comment.deleteMany({ blog: blog._id });
    await blog.deleteOne();
    await sendAdminActionAlert({ req, action: 'delete_blog', target: String(blog._id), details: `Title: ${blog.title}` });

    return res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const pendingAdminRequests = async (req, res) => {
  try {
    const users = await User.find({
      role: 'admin',
      adminApproved: false,
    })
      .select('-password -adminMfaSecret -adminMfaTempSecret -emailVerificationTokenHash')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const approveAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = 'admin';
    user.adminApproved = true;
    await user.save();
    await sendAdminActionAlert({ req, action: 'approve_admin', target: user.email, details: 'Admin request approved' });

    return res.status(200).json({
      success: true,
      message: 'Admin request approved',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const rejectAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = 'user';
    user.adminApproved = true;
    user.isSuperAdmin = false;
    await user.save();
    await sendAdminActionAlert({ req, action: 'reject_admin', target: user.email, details: 'Admin request rejected' });

    return res.status(200).json({
      success: true,
      message: 'Admin request rejected',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isSuperAdmin && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot demote super admin' });
    }

    user.role = role;
    user.adminApproved = role === 'admin' ? true : user.adminApproved;
    await user.save();
    await sendAdminActionAlert({ req, action: 'change_role', target: user.email, details: `New role: ${role}` });

    return res.status(200).json({
      success: true,
      message: 'Role updated',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const [users, blogs, comments, pendingAdmins] = await Promise.all([
      User.countDocuments(),
      Blog.countDocuments(),
      Comment.countDocuments(),
      User.countDocuments({ role: 'admin', adminApproved: false }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        users,
        blogs,
        comments,
        pendingAdmins,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = {
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
};
