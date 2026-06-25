/**
 * Script pour créer un compte administrateur.
 * Usage: node scripts/createAdmin.js [email] [password]
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDatabase, mongoose } = require('../config/database');
const User = require('../models/User');

const email = process.argv[2] || 'admin@timvio.com';
const password = process.argv[3] || 'Admin123!';

async function createAdmin() {
  await connectDatabase();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.isVerified = true;
    if (process.argv[3]) {
      const salt = await bcrypt.genSalt(10);
      existing.password = await bcrypt.hash(password, salt);
    }
    await existing.save();
    console.log(`✅ Compte admin mis à jour: ${email}`);
  } else {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.create({
      email,
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Timvio',
      isVerified: true,
    });
    console.log(`✅ Compte admin créé: ${email}`);
  }
  console.log(`   Mot de passe: ${password}`);
  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
