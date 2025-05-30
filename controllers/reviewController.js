const Review = require("../models/Review");
const User = require("../models/User");
const mongoose = require("mongoose"); // CORRECTION 1: Import manquant

// Créer une nouvelle review
const createReview = async (req, res) => {
  try {
    const { salon, rating, comment } = req.body;
    const client = req.user.userId;
    console.log("✔️ client dans createReview:", client);

    // Vérifier que le salon existe
    const salonExists = await User.findById(salon);
    if (!salonExists || salonExists.role !== 'salon') {
      return res.status(404).json({ message: "Salon introuvable" });
    }

    // Vérifier si le client a déjà reviewé ce salon
    const existingReview = await Review.findOne({ client, salon });
    if (existingReview) {
      return res.status(400).json({ message: "Vous avez déjà laissé un avis pour ce salon" });
    }

    const review = new Review({
      client,
      salon,
      rating,
      comment
    });

    await review.save();
    
    // Populer les données avant de retourner
    // CORRECTION 2: Utiliser les bons noms de champs
    await review.populate('client', 'firstName lastName email');
    await review.populate('salon', 'salon.name');

    res.status(201).json({
      message: "Avis créé avec succès",
      review
    });
  } catch (error) {
    console.error('Erreur createReview:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Obtenir toutes les reviews d'un salon
const getSalonReviews = async (req, res) => {
  try {
    const { salonId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // CORRECTION 3: Vérifier que salonId est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(salonId)) {
      return res.status(400).json({ message: "ID salon invalide" });
    }

    const reviews = await Review.find({ salon: salonId })
      .populate('client', 'firstName lastName') // CORRECTION 4: Bons noms de champs
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ salon: salonId });
    
    // Calculer la moyenne des ratings
    // CORRECTION 5: Utiliser new mongoose.Types.ObjectId()
    const avgRating = await Review.aggregate([
      { $match: { salon: new mongoose.Types.ObjectId(salonId) } },
      { $group: { _id: null, average: { $avg: "$rating" } } }
    ]);

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total
      },
      averageRating: avgRating.length > 0 ? parseFloat(avgRating[0].average.toFixed(1)) : 0
    });
  } catch (error) {
    console.error('Erreur getSalonReviews:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Obtenir toutes les reviews d'un client
const getClientReviews = async (req, res) => {
  try {
    const client = req.user.id;

    const reviews = await Review.find({ client })
      .populate('salon', 'salon.name address') // CORRECTION 6: Bon nom de champ
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    console.error('Erreur getClientReviews:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Obtenir une review spécifique
const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // CORRECTION 7: Vérifier que reviewId est valide
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "ID review invalide" });
    }

    const review = await Review.findById(reviewId)
      .populate('client', 'firstName lastName') // CORRECTION 8: Bons noms de champs
      .populate('salon', 'salon.name address');

    if (!review) {
      return res.status(404).json({ message: "Avis introuvable" });
    }

    res.json({ review });
  } catch (error) {
    console.error('Erreur getReviewById:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Modifier une review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const client = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "ID review invalide" });
    }

    const review = await Review.findOne({ _id: reviewId, client });

    if (!review) {
      return res.status(404).json({ message: "Avis introuvable ou non autorisé" });
    }

    // Mise à jour des champs
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();
    
    await review.populate('client', 'firstName lastName');
    await review.populate('salon', 'salon.name');

    res.json({
      message: "Avis mis à jour avec succès",
      review
    });
  } catch (error) {
    console.error('Erreur updateReview:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Supprimer une review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const client = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "ID review invalide" });
    }

    const review = await Review.findOne({ _id: reviewId, client });

    if (!review) {
      return res.status(404).json({ message: "Avis introuvable ou non autorisé" });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({ message: "Avis supprimé avec succès" });
  } catch (error) {
    console.error('Erreur deleteReview:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Obtenir les statistiques des reviews pour un salon
const getSalonReviewStats = async (req, res) => {
  try {
    const { salonId } = req.params;

    // CORRECTION 9: Vérifier que salonId est valide
    if (!mongoose.Types.ObjectId.isValid(salonId)) {
      return res.status(400).json({ message: "ID salon invalide" });
    }

    // CORRECTION 10: Utiliser new mongoose.Types.ObjectId()
    const stats = await Review.aggregate([
      { $match: { salon: new mongoose.Types.ObjectId(salonId) } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          ratings: {
            $push: "$rating"
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalReviews: 1,
          averageRating: { $round: ["$averageRating", 1] },
          ratingDistribution: {
            5: { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 5] } } } },
            4: { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 4] } } } },
            3: { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 3] } } } },
            2: { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 2] } } } },
            1: { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 1] } } } }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    }

    res.json(stats[0]);
  } catch (error) {
    console.error('Erreur getSalonReviewStats:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Obtenir toutes les reviews (admin uniquement)
const getAllReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const reviews = await Review.find()
      .populate('client', 'firstName lastName email') // CORRECTION 11: Bons noms de champs
      .populate('salon', 'salon.name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments();

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total
      }
    });
  } catch (error) {
    console.error('Erreur getAllReviews:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  createReview,
  getSalonReviews,
  getClientReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getSalonReviewStats,
  getAllReviews
};