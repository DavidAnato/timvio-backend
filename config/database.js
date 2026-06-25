const mongoose = require('mongoose');
const dns = require('dns');

mongoose.set('bufferCommands', false);

// Contourne les échecs querySrv ECONNREFUSED avec certains DNS routeur (Windows)
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI est requis dans le fichier .env');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB déconnecté');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB:', err.message);
  });

  console.log('✅ Connecté à MongoDB');
};

const isDbConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectDatabase, isDbConnected, mongoose };
