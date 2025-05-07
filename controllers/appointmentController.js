const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Availability = require('../models/Availability');
const Service = require('../models/Service');
const Professional = require('../models/Professional');

/**
 * @desc Créer un nouveau rendez-vous
 * @route POST /api/appointments
 * @access Private
 */
const createAppointment = async (req, res) => {
  try {
    const { salonId, serviceId, professionalId, date, startTime, endTime, notes } = req.body;
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

    // Vérifier que la date est dans le futur
    const appointmentDate = new Date(date);
    if (appointmentDate < new Date()) {
      return res.status(400).json({ message: "La date doit être dans le futur" });
    }

    // Vérifier que le créneau est disponible pour le salon
    const dayOfWeek = appointmentDate.getDay();
    const availability = await Availability.findOne({ salon: salonId });
    
    if (!availability) {
      return res.status(400).json({ message: "Le salon n'a pas défini de disponibilités" });
    }

    // Vérifier les exceptions du salon
    const exception = availability.exceptions.find(ex => 
      ex.date.toDateString() === appointmentDate.toDateString()
    );
    
    if (exception && !exception.isAvailable) {
      return res.status(400).json({ message: "Le salon n'est pas disponible à cette date" });
    }

    // Vérifier les créneaux bloqués du salon
    const blockedSlot = availability.blockedSlots.find(slot => 
      slot.date.toDateString() === appointmentDate.toDateString() &&
      slot.startTime <= startTime &&
      slot.endTime >= endTime
    );
    
    if (blockedSlot) {
      return res.status(400).json({ message: "Ce créneau est déjà bloqué" });
    }

    // Vérifier les horaires d'ouverture du salon
    const dayAvailability = availability.availability.find(a => a.dayOfWeek === dayOfWeek);
    if (!dayAvailability) {
      return res.status(400).json({ message: "Le salon n'a pas défini d'horaires pour ce jour" });
    }

    // Vérifier si le jour est disponible
    const slotAvailable = dayAvailability.slots.some(slot => {
      return startTime >= slot.startTime && endTime <= slot.endTime && slot.isAvailable;
    });

    if (!slotAvailable) {
      return res.status(400).json({ message: "Le créneau demandé n'est pas disponible pour ce salon" });
    }

    // Vérifier les conflits avec d'autres rendez-vous pour le même professionnel
    const professionalExistingAppointment = await Appointment.findOne({
      professional: professionalId,
      date: {
        $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
        $lt: new Date(appointmentDate.setHours(23, 59, 59, 999))
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

    // Vérifier les conflits avec d'autres rendez-vous pour le salon
    const salonExistingAppointment = await Appointment.findOne({
      salon: salonId,
      date: {
        $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
        $lt: new Date(appointmentDate.setHours(23, 59, 59, 999))
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

    if (salonExistingAppointment) {
      return res.status(400).json({ message: "Ce créneau est déjà réservé dans ce salon" });
    }

    // Créer le rendez-vous
    const appointment = new Appointment({
      client: clientId,
      salon: salonId,
      service: serviceId,
      professional: professionalId,
      date: appointmentDate,
      startTime,
      endTime,
      notes
    });

    await appointment.save();

    // Bloquer le créneau dans les disponibilités du salon
    availability.blockedSlots.push({
      date: appointmentDate,
      startTime,
      endTime
    });

    await availability.save();

    res.status(201).json({
      message: "Rendez-vous créé avec succès",
      appointment
    });
  } catch (error) {
    console.error("Erreur lors de la création du rendez-vous:", error);
    res.status(500).json({ message: "Erreur lors de la création du rendez-vous", error: error.message });
  }
};

/**
 * @desc Obtenir les rendez-vous d'un utilisateur
 * @route GET /api/appointments
 * @access Private
 */
const getAppointments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { role } = req.user;
    const { status, upcoming } = req.query;

    // Construire le filtre en fonction du rôle
    const filter = {};
    if (role === 'client') {
      filter.client = userId;
    } else if (role === 'salon') {
      filter.salon = userId;
    } else if (role === 'professional') {
      filter.professional = userId;
    }

    // Filtrer par statut si spécifié
    if (status) {
      filter.status = status;
    }

    // Filtrer les rendez-vous à venir si spécifié
    if (upcoming === 'true') {
      filter.date = { $gte: new Date() };
    }

    const appointments = await Appointment.find(filter)
      .populate('client', 'firstName lastName profilePicture')
      .populate('salon', 'firstName lastName profilePicture salon')
      .populate('service', 'name duration price')
      .populate('professional', 'name')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json(appointments);
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

    // Si le rendez-vous est annulé, débloquer le créneau
    if (status === 'canceled') {
      const availability = await Availability.findOne({ salon: appointment.salon });
      if (availability) {
        availability.blockedSlots = availability.blockedSlots.filter(slot => 
          !(slot.date.toDateString() === appointment.date.toDateString() &&
            slot.startTime === appointment.startTime &&
            slot.endTime === appointment.endTime)
        );
        await availability.save();
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

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointmentStatus
};