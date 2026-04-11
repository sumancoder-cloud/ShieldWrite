const argon2 = require('argon2');
const User = require('../models/user.model');

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const ensureSuperAdmin = async () => {
  const email = normalizeEmail(process.env.MAIN_ADMIN_EMAIL || 'suman.tati2005@gmail.com');
  const password = process.env.MAIN_ADMIN_PASSWORD || 'Suman@2005';

  if (!email || !password) {
    throw new Error('MAIN_ADMIN_EMAIL and MAIN_ADMIN_PASSWORD are required');
  }

  const hashedPassword = await argon2.hash(password);
  const existing = await User.findOne({ email });

  if (!existing) {
    await User.create({
      firstName: 'Main',
      lastName: 'Admin',
      age: 21,
      email,
      password: hashedPassword,
      role: 'admin',
      adminApproved: true,
      isSuperAdmin: true,
      isVerified: true,
    });
    return;
  }

  existing.role = 'admin';
  existing.adminApproved = true;
  existing.isSuperAdmin = true;
  existing.isVerified = true;
  existing.password = hashedPassword;
  await existing.save();
};

module.exports = {
  ensureSuperAdmin,
};
