const { ProfessionalAvailability } = require("../models/Availability");
const Professional = require("../models/Professional");
const User = require("../models/User");

/**
 * @desc Créer un nouveau professionnel
 * @route POST /api/professionals
 * @access Private (salon owner ou admin)
 */
const createProfessional = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      salonId,
      specialties,
      profilePicture
    } = req.body;

    // Validation des champs obligatoires (seuls name, salon et specialties sont requis selon le modèle)
    if (!name || !salonId || !specialties || !Array.isArray(specialties) || specialties.length === 0) {
      return res.status(400).json({
        message: "Nom, salonId et spécialités sont requis."
      });
    }

    // Vérifier que le salon existe et a bien le rôle "salon"
    const salon = await User.findById(salonId);
    if (!salon || salon.role !== "salon") {
      return res.status(404).json({ message: "Salon introuvable ou invalide." });
    }

    // Vérifier les permissions (seul le propriétaire du salon ou un admin peut créer)
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && userId !== salonId)) {
      return res.status(403).json({ message: "Accès interdit. Seul le propriétaire du salon peut ajouter des professionnels." });
    }

    // Vérifier l'unicité de l'email seulement si l'email est fourni
    if (email) {
      const existingProfessional = await Professional.findOne({ email });
      if (existingProfessional) {
        return res.status(400).json({ message: "Un professionnel avec cet email existe déjà." });
      }
    }

    // Créer l'objet professionnel avec seulement les champs du modèle
    const professionalData = {
      name,
      salon: salonId,
      specialties,
      isActive: true
    };

    // Ajouter les champs facultatifs seulement s'ils sont fournis
    if (email) professionalData.email = email;
    if (phone) professionalData.phone = phone;
    if (profilePicture) professionalData.profilePicture = profilePicture;

    // Créer le professionnel
    const professional = new Professional(professionalData);

    await professional.save();

    // Lier le professionnel au salon (si le salon a un champ professionals)
    if (salon.professionals) {
      salon.professionals.push(professional._id);
      await salon.save();
    }

    // Les disponibilités seront créées automatiquement par le middleware post-save
    // du modèle Professional (héritant du salon par défaut)

    // Populer les données pour la réponse
    await professional.populate('salon', 'name email');

    res.status(201).json({
      message: "Professionnel créé et lié au salon avec succès.",
      professional,
    });
  } catch (err) {
    console.error("Erreur création professionnel:", err);

    // Gestion des erreurs de validation Mongoose
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: "Erreur de validation", errors });
    }

    // Gestion des erreurs de duplication
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email déjà utilisé par un autre professionnel." });
    }

    res.status(500).json({ message: "Erreur serveur." });
  }
};

/**
 * @desc Obtenir la liste des professionnels d'un salon
 * @route GET /api/professionals/salon/:salonId
 * @access Public
 */
const getProfessionals = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { includeInactive } = req.query;

    // Vérifier que le salon existe
    const salon = await User.findById(salonId);
    if (!salon || salon.role !== "salon") {
      return res.status(404).json({ message: "Salon introuvable ou invalide." });
    }

    // Construire la requête
    const query = { salon: salonId };
    if (!includeInactive || includeInactive === 'false') {
      query.isActive = true;
    }

    // Récupérer les professionnels avec leurs statistiques
    const professionals = await Professional.find(query)
      .populate('salon', 'salon.name email')
      .sort({ name: 1 });

    // Récupérer les disponibilités pour chaque professionnel
    const professionalsWithAvailability = await Promise.all(
      professionals.map(async (prof) => {
        const availability = await ProfessionalAvailability.findOne({ 
          professional: prof._id 
        });
        
        return {
          ...prof.toObject(),
          hasAvailability: !!availability,
          inheritFromSalon: availability ? availability.inheritFromSalon : true
        };
      })
    );

    res.status(200).json({ 
      salon: {
        id: salon._id,
        name: salon.salon.name,
        email: salon.email
      },
      professionals: professionalsWithAvailability,
      count: professionalsWithAvailability.length
    });
  } catch (err) {
    console.error("Erreur récupération professionnels:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/**
 * @desc Obtenir un professionnel par ID
 * @route GET /api/professionals/:id
 * @access Public
 */
const getProfessionalById = async (req, res) => {
  try {
    const { id } = req.params;

    const professional = await Professional.findById(id)
      .populate('salon', 'salon.name email address');

    if (!professional) {
      return res.status(404).json({ message: "Professionnel introuvable." });
    }

    // Récupérer les disponibilités
    const availability = await ProfessionalAvailability.findOne({ 
      professional: id 
    });

    const response = {
      ...professional.toObject(),
      availability: availability ? {
        inheritFromSalon: availability.inheritFromSalon,
        hasCustomSchedule: !availability.inheritFromSalon,
        exceptionsCount: availability.exceptions.length,
        blockedSlotsCount: availability.blockedSlots.length
      } : null
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Erreur récupération professionnel:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/**
 * @desc Mettre à jour un professionnel
 * @route PUT /api/professionals/:id
 * @access Private (salon owner ou admin)
 */
const updateProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      phone, 
      specialties, 
      services, 
      bio, 
      experience,
      profilePicture,
      isActive 
    } = req.body;

    // Vérifier que le professionnel existe
    const professional = await Professional.findById(id).populate('salon');
    if (!professional) {
      return res.status(404).json({ message: "Professionnel introuvable." });
    }

    // Vérifier les permissions
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon._id.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    // Vérifier l'unicité de l'email si modifié
    if (email && email !== professional.email) {
      const existingProfessional = await Professional.findOne({ email, _id: { $ne: id } });
      if (existingProfessional) {
        return res.status(400).json({ message: "Un professionnel avec cet email existe déjà." });
      }
    }

    // Valider les services si fournis
    if (services && Array.isArray(services)) {
      for (const service of services) {
        if (!service.name || !service.duration || !service.price) {
          return res.status(400).json({ 
            message: "Chaque service doit avoir un nom, une durée et un prix." 
          });
        }
      }
    }

    // Préparer les données à mettre à jour
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (specialties) updateData.specialties = specialties;
    if (services) updateData.services = services;
    if (bio !== undefined) updateData.bio = bio;
    if (experience !== undefined) updateData.experience = experience;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Professional.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('salon', 'salon.name email');

    res.status(200).json({ 
      message: "Professionnel mis à jour avec succès.", 
      professional: updated 
    });
  } catch (err) {
    console.error("Erreur mise à jour professionnel:", err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: "Erreur de validation", errors });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email déjà utilisé." });
    }
    
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/**
 * @desc Supprimer un professionnel
 * @route DELETE /api/professionals/:id
 * @access Private (salon owner ou admin)
 */
const deleteProfessional = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le professionnel existe
    const professional = await Professional.findById(id).populate('salon');
    if (!professional) {
      return res.status(404).json({ message: "Professionnel introuvable." });
    }

    // Vérifier les permissions
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon._id.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    // Supprimer les disponibilités associées
    await ProfessionalAvailability.deleteMany({ professional: id });

    // Supprimer le professionnel
    await Professional.findByIdAndDelete(id);

    // Retirer la référence du salon
    await User.updateOne(
      { _id: professional.salon._id },
      { $pull: { professionals: id } }
    );

    res.status(200).json({ 
      message: "Professionnel et ses données associées supprimés avec succès." 
    });
  } catch (err) {
    console.error("Erreur suppression professionnel:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/**
 * @desc Désactiver/Activer un professionnel
 * @route PATCH /api/professionals/:id/toggle-status
 * @access Private (salon owner ou admin)
 */
const toggleProfessionalStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const professional = await Professional.findById(id).populate('salon');
    if (!professional) {
      return res.status(404).json({ message: "Professionnel introuvable." });
    }

    // Vérifier les permissions
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user || (user.role !== 'admin' && professional.salon._id.toString() !== userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    // Inverser le statut
    professional.isActive = !professional.isActive;
    await professional.save();

    res.status(200).json({ 
      message: `Professionnel ${professional.isActive ? 'activé' : 'désactivé'} avec succès.`,
      professional: {
        id: professional._id,
        name: professional.name,
        isActive: professional.isActive
      }
    });
  } catch (err) {
    console.error("Erreur changement statut professionnel:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/**
 * @desc Rechercher des professionnels par critères
 * @route GET /api/professionals/search
 * @access Public
 */
const searchProfessionals = async (req, res) => {
  try {
    const { 
      specialty, 
      city, 
      name, 
      salonId,
      minRating,
      maxPrice,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    // Construire la requête de recherche
    const query = { isActive: true };

    if (specialty) {
      query.specialties = { $in: [new RegExp(specialty, 'i')] };
    }

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    if (salonId) {
      query.salon = salonId;
    }

    if (minRating) {
      query['ratings.averageRating'] = { $gte: parseFloat(minRating) };
    }

    // Construire le pipeline d'agrégation
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'salon',
          foreignField: '_id',
          as: 'salonInfo'
        }
      },
      { $unwind: '$salonInfo' }
    ];

    // Filtrer par ville si spécifiée
    if (city) {
      pipeline.push({
        $match: {
          'salonInfo.address.city': { $regex: city, $options: 'i' }
        }
      });
    }

    // Filtrer par prix maximum si spécifié
    if (maxPrice) {
      pipeline.push({
        $match: {
          'services.price': { $lte: parseFloat(maxPrice) }
        }
      });
    }

    // Ajouter la pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Exécuter la recherche
    const professionals = await Professional.aggregate(pipeline);

    // Compter le total pour la pagination
    const totalPipeline = [...pipeline.slice(0, -2)]; // Retirer skip et limit
    totalPipeline.push({ $count: 'total' });
    const totalResult = await Professional.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.status(200).json({
      professionals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error("Erreur recherche professionnels:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

module.exports = {
  createProfessional,
  getProfessionals,
  getProfessionalById,
  updateProfessional,
  deleteProfessional,
  toggleProfessionalStatus,
  searchProfessionals,
};