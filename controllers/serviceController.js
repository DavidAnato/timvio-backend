const Service = require("../models/Service");
const User = require("../models/User");

/**
 * @desc Créer un nouveau service
 * @route POST /api/services
 * @access Private (salon)
 */
exports.createService = async (req, res) => {
  try {
    const salonId = req.user.userId;
    const { name, description, duration, price, category } = req.body;

    // Vérifier si l'utilisateur est un professionnel
    const user = await User.findById(salonId);
    if (!user || user.role !== "salon") {
      return res.status(403).json({ message: "Accès interdit." });
    }

    const service = await Service.create({
      salon: salonId,
      name,
      description,
      duration,
      price,
      category
    });

    res.status(201).json({
      message: "Service créé avec succès",
      service
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la création du service", 
      error: error.message 
    });
  }
};

/**
 * @desc Mettre à jour un service
 * @route PUT /api/services/:id
 * @access Private (salon)
 */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const salonId = req.user.userId;
    const updates = req.body;

    const service = await Service.findOne({ 
      _id: id, 
      salon: salonId 
    });

    if (!service) {
      return res.status(404).json({ message: "Service non trouvé" });
    }

    Object.keys(updates).forEach(key => {
      service[key] = updates[key];
    });

    await service.save();

    res.json({
      message: "Service mis à jour avec succès",
      service
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour du service", 
      error: error.message 
    });
  }
};

/**
 * @desc Récupérer tous les services d'un professionnel
 * @route GET /api/services/salon/:salonId
 * @access Public
 */
exports.getSalonServices = async (req, res) => {
  try {
    const { salonId } = req.params;

    const services = await Service.find({ 
      salon: salonId,
      isActive: true 
    });

    res.json(services);

  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la récupération des services", 
      error: error.message 
    });
  }
};

/**
 * @desc Supprimer un service
 * @route DELETE /api/services/:id
 * @access Private (salon)
 */
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const salonId = req.user.userId;

    const service = await Service.findOneAndDelete({ 
      _id: id, 
      salon: salonId 
    });

    if (!service) {
      return res.status(404).json({ message: "Service non trouvé" });
    }

    res.json({ message: "Service supprimé avec succès" });

  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la suppression du service", 
      error: error.message 
    });
  }
}; 