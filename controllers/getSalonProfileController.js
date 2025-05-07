const User = require("../models/User");
const Service = require("../models/Service");
const Availability = require("../models/Availability");
const Review = require("../models/Review");

const getSalonProfile = async (req, res) => {
  try {
    const salonId = req.params.id;

    // 1. Récupérer les infos de base du professionnel
    const salon = await User.findById(salonId)
      .select("-password -otp -verificationToken") // Exclure infos sensibles
      .lean();

    if (!salon || salon.role !== "salon") {
      return res.status(404).json({ message: "Salon non trouvé" });
    }

    // 2. Récupérer ses services
    const services = await Service.find({ salon: salonId, isActive: true }).lean();

    // 3. Récupérer ses disponibilités
    const availability = await Availability.findOne({ salon: salonId }).lean();

    // 4. Récupérer ses avis
    const reviews = await Review.find({ salon: salonId })
      .populate("client", "firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    // 5. Structuration de la réponse
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
      location: salon.location || salon.address,
      ratings: salon.ratings,
      services,
      availability: availability?.availability || [],
      exceptions: availability?.exceptions || [],
      blockedSlots: availability?.blockedSlots || [],
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
