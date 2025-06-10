const User = require("../models/User");
const Service = require("../models/Service");
const { Availability } = require("../models/Availability");
const Review = require("../models/Review");
const Professional = require("../models/Professional"); // <-- import

const getSalonProfile = async (req, res) => {
  try {
    const salonId = req.params.id;

    // 1. Récupérer les infos de base du salon
    const salon = await User.findById(salonId)
      .select("-password -otp -verificationToken")
      .lean();

    if (!salon || salon.role !== "salon") {
      return res.status(404).json({ message: "Salon non trouvé" });
    }

    // 2. Récupérer les professionnels associés à ce salon
    const professionals = await Professional.find({ salon: salonId, isActive: true })
      .select("name email phone specialties profilePicture ratings totalAppointments createdAt") // champs pertinents
      .lean();

    // 3. Récupérer les services actifs du salon
    const services = await Service.find({ salon: salonId, isActive: true }).lean();

    // 4. Récupérer les disponibilités
    const availability = await Availability.findOne({ salon: salonId }).lean();

    // 5. Récupérer les avis
    const reviews = await Review.find({ salon: salonId })
      .populate("client", "firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews).toFixed(1)
      : null;

    const ratings = {
      totalReviews,
      averageRating: averageRating ? parseFloat(averageRating) : null,
    };

    // 6. Structuration de la réponse
    const response = {
      id: salon._id,
      fullName: `${salon.firstName} ${salon.lastName}`,
      email: salon.email,
      phone: salon.phone,
      profilePicture: salon.profilePicture,
      bio: salon.bio,
      profession: salon.profession,
      speciality: salon.speciality,
      salon: salon.salon,
      address: salon.address,
      location: salon.location,
      ratings,
      professionals, // <-- array des professionnels
      services,
      availability,
      reviews,
      createdAt: salon.createdAt,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Erreur getSalonProfile:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { getSalonProfile };
