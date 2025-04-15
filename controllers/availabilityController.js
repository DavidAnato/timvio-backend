const Availability = require("../models/Availability");
const User = require("../models/User");

/**
 * @desc Créer ou mettre à jour la disponibilité d'un professionnel
 * @route POST /api/availability
 * @access Private (Professional)
 */
exports.setAvailability = async (req, res) => {
  try {
    const professionalId = req.user.userId; // ID du pro depuis le token
    const { availability } = req.body; // Liste des horaires envoyés
    console.log(professionalId)
    // Vérifier si l'utilisateur est un pro
    const user = await User.findById(professionalId);
    if (!user || user.role !== "professional") {
      return res.status(403).json({ message: "Accès interdit." });
    }

    let avail = await Availability.findOne({ professional: professionalId });

    if (avail) {
      // Mise à jour des disponibilités existantes
      avail.availability = availability;
      await avail.save();
    } else {
      // Création de la disponibilité
      avail = await Availability.create({ professional: professionalId, availability });
      user.availability = avail._id; // Associer au User
      await user.save();
    }

    res.status(200).json({ message: "Disponibilité mise à jour.", availability: avail });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Ajouter une exception (ex : jour férié, congé)
 * @route POST /api/availability/exception
 * @access Private (Professional)
 */
exports.addException = async (req, res) => {
  try {
    const professionalId = req.user.id;
    const { date, isAvailable } = req.body;

    const avail = await Availability.findOne({ professional: professionalId });
    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    // Vérifier si l'exception existe déjà
    const existingException = avail.exceptions.find((e) => e.date.toISOString() === new Date(date).toISOString());
    if (existingException) {
      existingException.isAvailable = isAvailable;
    } else {
      avail.exceptions.push({ date, isAvailable });
    }

    await avail.save();
    res.status(200).json({ message: "Exception ajoutée.", availability: avail });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Bloquer un créneau spécifique
 * @route POST /api/availability/block
 * @access Private (Professional)
 */
exports.blockTimeSlot = async (req, res) => {
  try {
    const professionalId = req.user.id;
    const { date, startTime, endTime } = req.body;

    const avail = await Availability.findOne({ professional: professionalId });
    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    avail.blockedSlots.push({ date, startTime, endTime });
    await avail.save();

    res.status(200).json({ message: "Créneau bloqué.", availability: avail });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Récupérer la disponibilité d'un professionnel
 * @route GET /api/availability/:professionalId
 * @access Public
 */
exports.getAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const avail = await Availability.findOne({ professional: professionalId });

    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    res.status(200).json(avail);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

/**
 * @desc Supprimer complètement une disponibilité
 * @route DELETE /api/availability
 * @access Private (Professional)
 */
exports.deleteAvailability = async (req, res) => {
  try {
    const professionalId = req.user.id;
    
    const avail = await Availability.findOneAndDelete({ professional: professionalId });

    if (!avail) {
      return res.status(404).json({ message: "Disponibilité non trouvée." });
    }

    // Supprimer la référence dans le User
    await User.findByIdAndUpdate(professionalId, { $unset: { availability: 1 } });

    res.status(200).json({ message: "Disponibilité supprimée." });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};
