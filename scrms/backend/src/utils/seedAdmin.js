require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding');

    const adminEmail = 'admin@reposys.com';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin@1234';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      existingAdmin.name = existingAdmin.name || 'Admin';
      existingAdmin.password = hashedPassword;
      existingAdmin.collegeId = existingAdmin.collegeId || 'ADMIN001';
      existingAdmin.department = existingAdmin.department || 'Administration';
      existingAdmin.role = 'Admin';
      existingAdmin.verified = true;
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('Admin seed updated: admin@reposys.com can log in with the seeded password');
      process.exit(0);
    }

    const collegeIdOwner = await User.findOne({ collegeId: 'ADMIN001' });
    const collegeId = collegeIdOwner ? `ADMIN-${Date.now()}` : 'ADMIN001';

    const newAdmin = new User({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      collegeId,
      department: 'Administration',
      role: 'Admin',
      verified: true,
      isActive: true,
    });

    await newAdmin.save();
    console.log('Admin created: admin@reposys.com can log in with the seeded password');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
