const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const morgan = require('morgan');
const { connectDatabase, isDbConnected } = require('./config/database');
const { requireDatabase } = require('./middlewares/dbHealth');

const authRoutes = require('./routes/authRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const salonRoutes = require('./routes/salonRoutes');
const userRoutes = require('./routes/userRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const professionalRoutes = require('./routes/professionalRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const { initializeNotificationService } = require('./services/appointmentNotifications');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/healthz', (req, res) => {
  const dbOk = isDbConnected();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk,
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/availability', requireDatabase, availabilityRoutes);
app.use('/api/services', requireDatabase, serviceRoutes);
app.use('/api/salons', requireDatabase, salonRoutes);
app.use('/api/users', requireDatabase, userRoutes);
app.use('/api/appointments', requireDatabase, appointmentRoutes);
app.use('/api/professionals', requireDatabase, professionalRoutes);
app.use('/api/reviews', requireDatabase, reviewRoutes);
app.use('/api/notifications', requireDatabase, notificationRoutes);
app.use('/api/payments', requireDatabase, paymentRoutes);
app.use('/api/admin', requireDatabase, adminRoutes);

app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ message: 'Erreur interne du serveur' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();
    initializeNotificationService();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Le port ${PORT} est déjà utilisé.`);
        console.error('   Lancez: pnpm kill-port  puis  pnpm dev');
        process.exit(1);
      }
      console.error('❌ Erreur serveur HTTP:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Impossible de démarrer le serveur:', err.message);
    process.exit(1);
  }
}

startServer();
