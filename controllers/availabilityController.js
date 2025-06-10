const { Availability, ProfessionalAvailability } = require("../models/Availability");
const Professional = require("../models/Professional");
const User = require("../models/User");

// ==================== CONTRÔLEURS SALON ====================

/**
 * @desc Créer ou mettre à jour la disponibilité d'un salon
 * @route POST /api/availability/salon
 * @access Private (salon)
 */
exports.setSalonAvailability = async (req, res) => {
  try {
    const salonId = req.user.userId;
    const { availability } = req.body;
    
    // Vérifier si l'utilisateur est un salon
    const user = await User.findById(salonId);
    if (!user || user.role !== "salon") {
      return res.status(403).json({ message: "Accès interdit. Seuls les salons peuvent définir leurs disponibilités." });
    }

    // Validation des données
    if (!availability || !Array.isArray(availability)) {
      return res.status(400).json({ message: "Format de disponibilité invalide." });
    }

    let avail = await Availability.findOne({ salon: salonId });

    if (avail) {
      // Mise à jour des disponibilités existantes
      avail.availability = availability;
      await avail.save();
    } else {
      // Création de la disponibilité
      avail = await Availability.create({ salon: salonId, availability });
    }

    // Notifier tous les professionnels du salon qui héritent des disponibilités
    await ProfessionalAvailability.updateMany(
      { salon: salonId, inheritFromSalon: true },
      { updatedAt: new Date() }
    );

    res.status(200).json({ 
      message: "Disponibilité du salon mise à jour.", 
      availability: avail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Ajouter une exception pour un salon
 * @route POST /api/availability/salon/exception
 * @access Private (salon)
 */
exports.addSalonException = async (req, res) => {
  try {
    const salonId = req.user.userId;
    const { date, isAvailable, reason } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date requise." });
    }

    const avail = await Availability.findOne({ salon: salonId });
    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée. Veuillez d'abord créer vos horaires." });
    }

    // Vérifier si l'exception existe déjà
    const exceptionDate = new Date(date);
    const existingExceptionIndex = avail.exceptions.findIndex(
      (e) => new Date(e.date).toDateString() === exceptionDate.toDateString()
    );

    if (existingExceptionIndex !== -1) {
      // Mettre à jour l'exception existante
      avail.exceptions[existingExceptionIndex].isAvailable = isAvailable ?? false;
      avail.exceptions[existingExceptionIndex].reason = reason;
    } else {
      // Ajouter nouvelle exception
      avail.exceptions.push({ 
        date: exceptionDate, 
        isAvailable: isAvailable ?? false,
        reason 
      });
    }

    await avail.save();
    res.status(200).json({ 
      message: "Exception ajoutée au salon.", 
      availability: avail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Bloquer un créneau spécifique pour un salon
 * @route POST /api/availability/salon/block
 * @access Private (salon)
 */
exports.blockSalonTimeSlot = async (req, res) => {
  try {
    const salonId = req.user.userId;
    const { date, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "Date, heure de début et heure de fin requises." });
    }

    const avail = await Availability.findOne({ salon: salonId });
    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    avail.blockedSlots.push({ 
      date: new Date(date), 
      startTime, 
      endTime,
      reason 
    });
    await avail.save();

    res.status(200).json({ 
      message: "Créneau bloqué pour le salon.", 
      availability: avail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// ==================== CONTRÔLEURS PROFESSIONNEL ====================

/**
 * @desc Créer ou mettre à jour la disponibilité d'un professionnel
 * @route POST /api/availability/professional/:professionalId
 * @access Private (salon owner ou professionnel)
 */
exports.setProfessionalAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { availability, inheritFromSalon } = req.body;
    const userId = req.user.userId;

    // Vérifier que le professionnel existe
    const professional = await Professional.findById(professionalId).populate('salon');
    if (!professional) {
      return res.status(404).json({ message: "Professionnel non trouvé." });
    }

    // Vérifier les permissions (propriétaire du salon ou admin)
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon._id.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    let profAvail = await ProfessionalAvailability.findOne({ professional: professionalId });

    const updateData = {
      inheritFromSalon: inheritFromSalon ?? true,
      availability: inheritFromSalon ? [] : (availability || [])
    };

    if (profAvail) {
      Object.assign(profAvail, updateData);
      await profAvail.save();
    } else {
      profAvail = await ProfessionalAvailability.create({
        professional: professionalId,
        salon: professional.salon._id,
        ...updateData
      });
    }

    await profAvail.populate('professional salon');
    
    res.status(200).json({ 
      message: "Disponibilité du professionnel mise à jour.", 
      availability: profAvail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Ajouter une exception pour un professionnel
 * @route POST /api/availability/professional/:professionalId/exception
 * @access Private (salon owner ou professionnel)
 */
exports.addProfessionalException = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, isAvailable, reason } = req.body;
    const userId = req.user.userId;

    if (!date) {
      return res.status(400).json({ message: "Date requise." });
    }

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professionnel non trouvé." });
    }

    // Vérifier les permissions
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    let profAvail = await ProfessionalAvailability.findOne({ professional: professionalId });
    if (!profAvail) {
      // Créer les disponibilités si elles n'existent pas
      profAvail = await ProfessionalAvailability.create({
        professional: professionalId,
        salon: professional.salon,
        inheritFromSalon: true,
        availability: [],
        exceptions: [],
        blockedSlots: []
      });
    }

    // Vérifier si l'exception existe déjà
    const exceptionDate = new Date(date);
    const existingExceptionIndex = profAvail.exceptions.findIndex(
      (e) => new Date(e.date).toDateString() === exceptionDate.toDateString()
    );

    if (existingExceptionIndex !== -1) {
      profAvail.exceptions[existingExceptionIndex].isAvailable = isAvailable ?? false;
      profAvail.exceptions[existingExceptionIndex].reason = reason;
    } else {
      profAvail.exceptions.push({ 
        date: exceptionDate, 
        isAvailable: isAvailable ?? false,
        reason 
      });
    }

    await profAvail.save();
    res.status(200).json({ 
      message: "Exception ajoutée pour le professionnel.", 
      availability: profAvail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Bloquer un créneau pour un professionnel
 * @route POST /api/availability/professional/:professionalId/block
 * @access Private (salon owner ou professionnel)
 */
exports.blockProfessionalTimeSlot = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, startTime, endTime, reason } = req.body;
    const userId = req.user.userId;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "Date, heure de début et heure de fin requises." });
    }

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professionnel non trouvé." });
    }

    // Vérifier les permissions
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    let profAvail = await ProfessionalAvailability.findOne({ professional: professionalId });
    if (!profAvail) {
      profAvail = await ProfessionalAvailability.create({
        professional: professionalId,
        salon: professional.salon,
        inheritFromSalon: true,
        availability: [],
        exceptions: [],
        blockedSlots: []
      });
    }

    profAvail.blockedSlots.push({ 
      date: new Date(date), 
      startTime, 
      endTime,
      reason 
    });
    await profAvail.save();

    res.status(200).json({ 
      message: "Créneau bloqué pour le professionnel.", 
      availability: profAvail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// ==================== CONTRÔLEURS DE CONSULTATION ====================

/**
 * @desc Récupérer la disponibilité d'un salon
 * @route GET /api/availability/salon/:salonId
 * @access Public
 */
exports.getSalonAvailability = async (req, res) => {
  try {
    const { salonId } = req.params;
    
    const avail = await Availability.findOne({ salon: salonId }).populate('salon', 'salon.name email');
    
    if (!avail) {
      return res.status(404).json({ message: "Disponibilité du salon non trouvée." });
    }

    res.status(200).json(avail);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Récupérer la disponibilité d'un professionnel
 * @route GET /api/availability/professional/:professionalId
 * @access Public
 */
exports.getProfessionalAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    
    const profAvail = await ProfessionalAvailability.findOne({ professional: professionalId })
      .populate('professional', 'name specialties')
      .populate('salon', 'salon.name');
    
    if (!profAvail) {
      return res.status(404).json({ message: "Disponibilité du professionnel non trouvée." });
    }

    // Si le professionnel hérite du salon, récupérer les disponibilités du salon
    let effectiveAvailability = profAvail.availability;
    if (profAvail.inheritFromSalon) {
      const salonAvail = await Availability.findOne({ salon: profAvail.salon._id });
      effectiveAvailability = salonAvail ? salonAvail.availability : [];
    }

    const response = {
      ...profAvail.toObject(),
      effectiveAvailability
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Récupérer tous les professionnels disponibles d'un salon
 * @route GET /api/availability/salon/:salonId/professionals
 * @access Public
 */
exports.getSalonProfessionalsAvailability = async (req, res) => {
  try {
    const { salonId } = req.params;
    
    const professionals = await Professional.find({ salon: salonId, isActive: true });
    const professionalsAvailability = await ProfessionalAvailability.find({ 
      salon: salonId 
    }).populate('professional', 'name specialties services');

    // Récupérer les disponibilités du salon pour les professionnels qui héritent
    const salonAvail = await Availability.findOne({ salon: salonId });

    const result = professionalsAvailability.map(profAvail => {
      let effectiveAvailability = profAvail.availability;
      if (profAvail.inheritFromSalon && salonAvail) {
        effectiveAvailability = salonAvail.availability;
      }

      return {
        ...profAvail.toObject(),
        effectiveAvailability
      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Vérifier la disponibilité à une date/heure spécifique
 * @route GET /api/availability/check/:professionalId
 * @access Public
 */
exports.checkAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "Date, heure de début et heure de fin requises." });
    }

    const profAvail = await ProfessionalAvailability.findOne({ professional: professionalId });
    if (!profAvail) {
      return res.status(404).json({ message: "Professionnel non trouvé." });
    }

    const isAvailable = await profAvail.isAvailableAt(date, startTime, endTime);

    res.status(200).json({ 
      isAvailable,
      professional: professionalId,
      date,
      timeSlot: { startTime, endTime }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// ==================== CONTRÔLEURS DE SUPPRESSION ====================

/**
 * @desc Supprimer la disponibilité d'un salon
 * @route DELETE /api/availability/salon
 * @access Private (salon)
 */
exports.deleteSalonAvailability = async (req, res) => {
  try {
    const salonId = req.user.userId;
    
    const avail = await Availability.findOneAndDelete({ salon: salonId });
    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    res.status(200).json({ message: "Disponibilité du salon supprimée." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Supprimer une exception
 * @route DELETE /api/availability/salon/exception/:exceptionId
 * @access Private (salon)
 */
exports.removeSalonException = async (req, res) => {
  try {
    const salonId = req.user.userId;
    const { exceptionId } = req.params;

    const avail = await Availability.findOne({ salon: salonId });
    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    avail.exceptions = avail.exceptions.filter(exc => exc._id.toString() !== exceptionId);
    await avail.save();

    res.status(200).json({ message: "Exception supprimée.", availability: avail });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Débloquer un créneau
 * @route DELETE /api/availability/salon/block/:blockId
 * @access Private (salon)
 */
exports.unblockSalonTimeSlot = async (req, res) => {
  try {
    const salonId = req.user.userId;
    const { blockId } = req.params;

    const avail = await Availability.findOne({ salon: salonId });
    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    avail.blockedSlots = avail.blockedSlots.filter(slot => slot._id.toString() !== blockId);
    await avail.save();

    res.status(200).json({ message: "Créneau débloqué.", availability: avail });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Supprimer la disponibilité personnalisée d'un professionnel (retour à l'héritage du salon)
 * @route DELETE /api/availability/professional/:professionalId
 * @access Private (salon owner)
 */
exports.deleteProfessionalAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const userId = req.user.userId;

    // Vérifier que le professionnel existe
    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professionnel non trouvé." });
    }

    // Vérifier les permissions (propriétaire du salon)
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    const profAvail = await ProfessionalAvailability.findOne({ professional: professionalId });
    if (!profAvail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    // Remettre à l'héritage du salon
    profAvail.inheritFromSalon = true;
    profAvail.availability = [];
    await profAvail.save();

    res.status(200).json({ 
      message: "Disponibilité personnalisée supprimée. Le professionnel hérite maintenant des horaires du salon.",
      availability: profAvail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Supprimer une exception d'un professionnel
 * @route DELETE /api/availability/professional/:professionalId/exception/:exceptionId
 * @access Private (salon owner)
 */
exports.removeProfessionalException = async (req, res) => {
  try {
    const { professionalId, exceptionId } = req.params;
    const userId = req.user.userId;

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professionnel non trouvé." });
    }

    // Vérifier les permissions
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    const profAvail = await ProfessionalAvailability.findOne({ professional: professionalId });
    if (!profAvail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    profAvail.exceptions = profAvail.exceptions.filter(exc => exc._id.toString() !== exceptionId);
    await profAvail.save();

    res.status(200).json({ 
      message: "Exception supprimée du professionnel.", 
      availability: profAvail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Débloquer un créneau d'un professionnel
 * @route DELETE /api/availability/professional/:professionalId/block/:blockId
 * @access Private (salon owner)
 */
exports.unblockProfessionalTimeSlot = async (req, res) => {
  try {
    const { professionalId, blockId } = req.params;
    const userId = req.user.userId;

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professionnel non trouvé." });
    }

    // Vérifier les permissions
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    const profAvail = await ProfessionalAvailability.findOne({ professional: professionalId });
    if (!profAvail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    profAvail.blockedSlots = profAvail.blockedSlots.filter(slot => slot._id.toString() !== blockId);
    await profAvail.save();

    res.status(200).json({ 
      message: "Créneau débloqué pour le professionnel.", 
      availability: profAvail 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Récupérer les créneaux disponibles pour un professionnel sur une date donnée
 * @route GET /api/availability/slots
 * @access Public
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { professionalId, date, duration = 30 } = req.query;

    if (!professionalId || !date) {
      return res.status(400).json({ message: "ID du professionnel et date requis." });
    }

    const profAvail = await ProfessionalAvailability.findOne({ professional: professionalId });
    if (!profAvail) {
      return res.status(404).json({ message: "Professionnel non trouvé." });
    }

    // Récupérer la disponibilité effective
    let effectiveAvailability = [];
    if (profAvail.inheritFromSalon) {
      const salonAvail = await Availability.findOne({ salon: profAvail.salon });
      effectiveAvailability = salonAvail ? salonAvail.availability : [];
    } else {
      effectiveAvailability = profAvail.availability;
    }

    const requestDate = new Date(date);
    const dayOfWeek = requestDate.getDay();
    
    // Trouver les horaires du jour
    const daySchedule = effectiveAvailability.find(avail => avail.dayOfWeek === dayOfWeek);
    
    if (!daySchedule || !daySchedule.isAvailable) {
      return res.status(200).json({
        date,
        availableSlots: []
      });
    }

    // Vérifier les exceptions
    const hasException = profAvail.exceptions.some(exception => {
      const exceptionDate = new Date(exception.date);
      return exceptionDate.toDateString() === requestDate.toDateString() && !exception.isAvailable;
    });

    if (hasException) {
      return res.status(200).json({
        date,
        availableSlots: []
      });
    }

    // Générer les créneaux disponibles
    const availableSlots = [];
    const durationMinutes = parseInt(duration);

    for (const timeSlot of daySchedule.timeSlots) {
      const [startHour, startMin] = timeSlot.startTime.split(':').map(Number);
      const [endHour, endMin] = timeSlot.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      for (let currentMinutes = startMinutes; currentMinutes + durationMinutes <= endMinutes; currentMinutes += durationMinutes) {
        const slotStartTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
        const slotEndTime = `${Math.floor((currentMinutes + durationMinutes) / 60).toString().padStart(2, '0')}:${((currentMinutes + durationMinutes) % 60).toString().padStart(2, '0')}`;

        // Vérifier si ce créneau n'est pas bloqué
        const isBlocked = profAvail.blockedSlots.some(slot => {
          const slotDate = new Date(slot.date);
          return slotDate.toDateString() === requestDate.toDateString() &&
                 ((slotStartTime >= slot.startTime && slotStartTime < slot.endTime) ||
                  (slotEndTime > slot.startTime && slotEndTime <= slot.endTime) ||
                  (slotStartTime <= slot.startTime && slotEndTime >= slot.endTime));
        });

        if (!isBlocked) {
          availableSlots.push({
            startTime: slotStartTime,
            endTime: slotEndTime
          });
        }
      }
    }

    res.status(200).json({
      date,
      availableSlots
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};