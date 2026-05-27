const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const connectDB = require('../config/db');

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    const email = 'vedprakashvp9956@gmail.com';
    const password = 'ved9956';

    const adminExists = await Admin.findOne({ email });

    if (adminExists) {
      console.log('Admin user already exists');
      process.exit();
    }

    const admin = await Admin.create({
      email,
      password,
    });

    if (admin) {
      console.log(`Admin user created: ${admin.email}`);
    } else {
      console.log('Invalid admin data');
    }

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

createAdmin();
