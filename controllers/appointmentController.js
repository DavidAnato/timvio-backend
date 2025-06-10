const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { ProfessionalAvailability } = require('../models/Availability');
const Service = require('../models/Service');
const Professional = require('../models/Professional');
const { createNotification } = require('../utils/createNotification');

/**
 * @desc Créer un nouveau rendez-vous
 * @route POST /api/appointments
 * @access Private
 */
const createAppointment = async (req, res) => {
  try {
    const { 
      salonId, 
      serviceId, 
      professionalId, 
      date, 
      startTime, 
      notes,
      paymentType, // 'deposit' ou 'on_site'
      paymentIntentId // Si paiement d'acompte
    } = req.body;
    
    const clientId = req.user.userId;
    
    // Vérifier que le salon existe
    const salon = await User.findOne({ _id: salonId, role: 'salon' });
    if (!salon) {
      return res.status(404).json({ message: "Salon non trouvé" });
    }
    
    // Vérifier que le service existe
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service non trouvé" });
    }
    
    // Calculer l'heure de fin en ajoutant la durée du service à l'heure de début
    const endTime = calculateEndTime(startTime, service.duration);

    // Vérifier que le professionnel existe
    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professionnel non trouvé" });
    }

    // Vérifier que le client existe
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Corriger la conversion de la date
    let appointmentDate;
    
    // Vérifier si date est au format "jour de semaine + jour + mois"
    if (typeof date === 'string' && date.match(/[A-Za-zÀ-ÿ]+\s+\d+\s+[A-Za-zÀ-ÿ]+/)) {
      // Extraire les parties de la date
      const parts = date.split(' ');
      const day = parseInt(parts[1], 10);
      const month = getMonthNumber(parts[2]);
      const year = new Date().getFullYear();
      
      appointmentDate = new Date(year, month, day);
      console.log(`Date convertie: ${day}/${month}/${year} =>`, appointmentDate);
    } else {
      // Essayer de parser normalement
      appointmentDate = new Date(date);
    }
        
    // Vérifier si la date est valide
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ message: "Format de date invalide" });
    }

    // Vérifier que la date est dans le futur
    const now = new Date();
    if (appointmentDate < now) {
      return res.status(400).json({ message: "La date doit être dans le futur" });
    }

    // VÉRIFICATION DES DISPONIBILITÉS DU PROFESSIONNEL
    // Récupérer les disponibilités du professionnel
    const professionalAvailability = await ProfessionalAvailability.findOne({ 
      professional: professionalId,
      salon: salonId 
    });
    
    if (!professionalAvailability) {
      return res.status(400).json({ message: "Le professionnel n'a pas défini de disponibilités" });
    }

    // Vérifier si le professionnel est disponible à ce créneau
    const isAvailable = await professionalAvailability.isAvailableAt(appointmentDate, startTime, endTime);
    
    if (!isAvailable) {
      return res.status(400).json({ 
        message: "Le professionnel n'est pas disponible à ce créneau" 
      });
    }

    // Créer une copie de la date pour éviter des problèmes avec setHours
    const appointmentDateStart = new Date(appointmentDate);
    const appointmentDateEnd = new Date(appointmentDate);

    // Vérifier les conflits avec d'autres rendez-vous pour le même professionnel
    const professionalExistingAppointment = await Appointment.findOne({
      professional: professionalId,
      date: {
        $gte: new Date(appointmentDateStart.setHours(0, 0, 0, 0)),
        $lt: new Date(appointmentDateEnd.setHours(23, 59, 59, 999))
      },
      status: { $nin: ['canceled', 'completed'] },
      $or: [
        // vérifie si le nouveau rendez-vous chevauche un existant
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } }
          ]
        }
      ]
    });

    if (professionalExistingAppointment) {
      return res.status(400).json({ 
        message: "Le professionnel n'est pas disponible à ce moment, il a déjà un rendez-vous programmé" 
      });
    }

    // GESTION DU PAIEMENT
    // Déterminer le statut de paiement initial
    let initialPaymentStatus = 'pending';
    let paymentId = null;

    if (paymentType === 'deposit' && paymentIntentId) {
      // Vérifier que le paiement a bien été effectué
      const stripe = require('../config/stripe');
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        initialPaymentStatus = 'partial'; // Acompte payé
        paymentId = paymentIntentId;
      } else {
        return res.status(400).json({ 
          message: "Le paiement de l'acompte n'a pas abouti" 
        });
      }
    } else if (paymentType === 'on_site') {
      initialPaymentStatus = 'pending'; // Paiement sur place
    }

    // Créer le rendez-vous avec les informations de paiement
    const appointment = new Appointment({
      client: clientId,
      salon: salonId,
      service: serviceId,
      professional: professionalId,
      date: appointmentDate,
      startTime,
      endTime,
      notes,
      paymentStatus: initialPaymentStatus,
      paymentId: paymentId
    });

    await appointment.save();

    // Bloquer le créneau dans les disponibilités du professionnel
    professionalAvailability.blockedSlots.push({
      date: appointmentDate,
      startTime,
      endTime,
      reason: "Rendez-vous programmé"
    });

    await professionalAvailability.save();

    // Créer une notification pour le client
    await createNotification(
      "Rendez-vous programmé", 
      `Votre rendez-vous avec ${professional.name} a été programmé le ${appointmentDate.toLocaleDateString()} à ${startTime}`, 
      clientId,
      {
        appointmentId: appointment._id.toString(),
        type: 'appointment_created',
        professionalName: professional.name,
        salonName: salon.businessName || salon.firstName,
        date: appointmentDate.toISOString(),
        startTime: startTime
      }
    );

    // Créer une notification pour le salon
    await createNotification(
      "Nouveau rendez-vous", 
      `${client.firstName} ${client.lastName} a programmé un rendez-vous avec ${professional.name} le ${appointmentDate.toLocaleDateString()} à ${startTime}`, 
      salonId,
      {
        appointmentId: appointment._id.toString(),
        type: 'appointment_booked',
        clientName: `${client.firstName} ${client.lastName}`,
        professionalName: professional.name,
        date: appointmentDate.toISOString(),
        startTime: startTime
      }
    );
        
    res.status(201).json({
      message: "Rendez-vous créé avec succès",
      appointment: {
        ...appointment.toObject(),
        paymentType: paymentType
      }
    });
  } catch (error) {
    console.error("Erreur lors de la création du rendez-vous:", error);
    res.status(500).json({ message: "Erreur lors de la création du rendez-vous", error: error.message });
  }
};

/**
 * @desc Compléter le paiement du solde restant
 * @route POST /api/appointments/:id/complete-payment
 * @access Private
 */
const completePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentIntentId } = req.body;
    
    const appointment = await Appointment.findById(id).populate('service');
    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }

    // Vérifier les permissions
    if (appointment.salon.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Si c'est un paiement sur place
    if (!paymentIntentId) {
      appointment.paymentStatus = 'paid';
      await appointment.save();
      
      return res.status(200).json({
        message: "Paiement sur place confirmé",
        appointment
      });
    }

    // Sinon vérifier le paiement Stripe
    const stripe = require('../config/stripe');
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      appointment.paymentStatus = 'paid';
      await appointment.save();
      
      res.status(200).json({
        message: "Paiement complété avec succès",
        appointment
      });
    } else {
      res.status(400).json({ message: "Le paiement n'a pas abouti" });
    }

  } catch (error) {
    console.error("Erreur lors de la completion du paiement:", error);
    res.status(500).json({ message: "Erreur lors de la completion du paiement", error: error.message });
  }
};

/**
 * @desc Obtenir les rendez-vous d'un utilisateur avec pagination
 * @route GET /api/appointments
 * @access Private
 */
const getAppointments = async (req, res) => {
  try {
      const {
          status,
          upcoming,
          page = 1,
          limit = 10
      } = req.query;

      const { userId, role } = req.user;

      const filter = {};

      // Appliquer les rôles
      if (role === 'client') {
          filter.client = userId;
      } else if (role === 'salon') {
          filter.salon = userId;
      } else if (role === 'professional') {
          filter.professional = userId;
      }

      // Filtrer par statut
      if (status) {
          filter.status = status;
      }

      // Filtrer les rendez-vous à venir
      if (upcoming === 'true') {
          filter.date = { $gte: new Date() };
      }

      const skip = (page - 1) * limit;

      const total = await Appointment.countDocuments(filter);

      const appointments = await Appointment.find(filter)
          .populate('client', 'firstName lastName profilePicture')
          .populate('salon', 'firstName lastName profilePicture salon address')
          .populate('service', 'name duration price')
          .populate('professional', 'name')
          .sort({ date: 1, startTime: 1 })
          .skip(skip)
          .limit(parseInt(limit));

      res.status(200).json({
          appointments,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalResults: total
      });

  } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des rendez-vous", error: error.message });
  }
};

/**
 * @desc Mettre à jour le statut d'un rendez-vous
 * @route PATCH /api/appointments/:id/status
 * @access Private
 */
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const { role } = req.user;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous non trouvé" });
    }

    // Vérifier les permissions
    if (role === 'client' && appointment.client.toString() !== userId) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    if (role === 'salon' && appointment.salon.toString() !== userId) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Mettre à jour le statut
    appointment.status = status;
    await appointment.save();

    // Si le rendez-vous est annulé, débloquer le créneau du professionnel
    if (status === 'canceled') {
      const professionalAvailability = await ProfessionalAvailability.findOne({ 
        professional: appointment.professional,
        salon: appointment.salon 
      });
      
      if (professionalAvailability) {
        professionalAvailability.blockedSlots = professionalAvailability.blockedSlots.filter(slot => 
          !(slot.date.toDateString() === appointment.date.toDateString() &&
            slot.startTime === appointment.startTime &&
            slot.endTime === appointment.endTime)
        );
        await professionalAvailability.save();
      }
    }

    res.status(200).json({
      message: "Statut du rendez-vous mis à jour avec succès",
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut", error: error.message });
  }
};

// Fonction pour convertir le nom de mois en numéro (0-11)
function getMonthNumber(monthName) {
  const months = {
    'janvier': 0,
    'février': 1, 'fevrier': 1,
    'mars': 2,
    'avril': 3,
    'mai': 4,
    'juin': 5,
    'juillet': 6,
    'août': 7, 'aout': 7,
    'septembre': 8,
    'octobre': 9,
    'novembre': 10,
    'décembre': 11, 'decembre': 11
  };
  
  return months[monthName.toLowerCase()] || 0;
}

/**
 * Calcule l'heure de fin en ajoutant la durée (en minutes) à l'heure de début
 * @param {string} startTime - Format "HH:MM"
 * @param {number} durationMinutes - Durée en minutes
 * @returns {string} - Heure de fin au format "HH:MM"
 */
function calculateEndTime(startTime, durationMinutes) {
  if (!startTime || typeof startTime !== 'string') {
    console.error("Format d'heure de début invalide:", startTime);
    return "00:00";
  }

  try {
    const [hours, minutes] = startTime.split(':').map(num => parseInt(num, 10));
    const date = new Date();
    date.setHours(hours || 0);
    date.setMinutes(minutes || 0);
    date.setMinutes(date.getMinutes() + (durationMinutes || 0));
    
    const newHours = date.getHours().toString().padStart(2, '0');
    const newMinutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${newHours}:${newMinutes}`;
  } catch (error) {
    console.error("Erreur lors du calcul de l'heure de fin:", error);
    return "00:00";
  }
}

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  completePayment
};