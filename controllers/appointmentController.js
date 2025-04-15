const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Availability = require('../models/Availability');
const Service = require('../models/Service');

/**
 * @desc Créer un nouveau rendez-vous
 * @route POST /api/appointments
 * @access Private
 */
const createAppointment = async (req, res) => {
  try {
    const { professionalId, serviceId, date, startTime, endTime, notes } = req.body;
    const clientId = req.user.userId;

    // Vérifier que le professionnel existe
    const professional = await User.findOne({ _id: professionalId, role: 'professional' });
    if (!professional) {
      return res.status(404).json({ message: "Professionnel non trouvé" });
    }

    // Vérifier que le service existe
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service non trouvé" });
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

    // Vérifier que le créneau est disponible
    const dayOfWeek = appointmentDate.getDay();
    const availability = await Availability.findOne({ professional: professionalId });
    
    if (!availability) {
      return res.status(400).json({ message: "Le professionnel n'a pas défini de disponibilités" });
    }

    // Vérifier les exceptions
    const exception = availability.exceptions.find(ex => 
      ex.date.toDateString() === appointmentDate.toDateString()
    );
    
    if (exception && !exception.isAvailable) {
      return res.status(400).json({ message: "Le professionnel n'est pas disponible à cette date" });
    }

    // Vérifier les créneaux bloqués
    const blockedSlot = availability.blockedSlots.find(slot => 
      slot.date.toDateString() === appointmentDate.toDateString() &&
      slot.startTime <= startTime &&
      slot.endTime >= endTime
    );
    
    if (blockedSlot) {
      return res.status(400).json({ message: "Ce créneau est déjà bloqué" });
    }

    // Vérifier les horaires d'ouverture
    const dayAvailability = availability.availability.find(a => a.dayOfWeek === dayOfWeek);
    if (!dayAvailability || !dayAvailability.isAvailable) {
      return res.status(400).json({ message: "Le professionnel n'est pas disponible ce jour" });
    }

    if (startTime < dayAvailability.startTime || endTime > dayAvailability.endTime) {
      return res.status(400).json({ message: "Le créneau est en dehors des horaires d'ouverture" });
    }

    // Vérifier les conflits avec d'autres rendez-vous
    const existingAppointment = await Appointment.findOne({
      professional: professionalId,
      date: appointmentDate,
      status: { $ne: 'cancelled' },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "Ce créneau est déjà réservé" });
    }

    // Créer le rendez-vous
    const appointment = new Appointment({
      client: clientId,
      professional: professionalId,
      service: serviceId,
      date: appointmentDate,
      startTime,
      endTime,
      notes
    });

    await appointment.save();

    // Bloquer le créneau dans les disponibilités
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
      .populate('professional', 'firstName lastName profilePicture salon')
      .populate('service', 'name duration price')
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

    if (role === 'professional' && appointment.professional.toString() !== userId) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Mettre à jour le statut
    appointment.status = status;
    await appointment.save();

    // Si le rendez-vous est annulé, débloquer le créneau
    if (status === 'cancelled') {
      const availability = await Availability.findOne({ professional: appointment.professional });
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