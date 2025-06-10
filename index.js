const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const morgan = require('morgan');

// Import des routes
const authRoutes = require('./routes/authRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const salonRoutes = require('./routes/SalonRoutes');
const userRoutes = require('./routes/userRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const professionalRoutes = require('./routes/professionalRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const { initializeNotificationService } = require('./services/appointmentNotifications');
// Configuration
dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => console.error('Erreur de connexion MongoDB:', err));

// Port
const PORT = process.env.PORT || 5000;



// Au démarrage de votre serveur
initializeNotificationService();


app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});