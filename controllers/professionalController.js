const Professional = require("../models/Professional");
const User = require("../models/User");

const createProfessional = async (req, res) => {
  try {
    const { name, salonId } = req.body;

    if (!name || !salonId) {
      return res.status(400).json({ message: "Nom et salonId sont requis." });
    }

    // Vérifier que le salon existe et a bien le rôle "salon"
    const salon = await User.findById(salonId);
    if (!salon || salon.role !== "salon") {
      return res.status(404).json({ message: "Salon introuvable ou invalide." });
    }

    // Créer le professionnel
    const professional = new Professional({ name });
    await professional.save();

    // Lier le professionnel au salon
    salon.professionals.push(professional._id);
    await salon.save();

    res.status(201).json({
      message: "Professionnel créé et lié au salon.",
      professional,
    });
  } catch (err) {
    console.error("Erreur création professionnel:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Obtenir la liste des professionnels d’un salon
const getProfessionals = async (req, res) => {
  try {
    const { salonId } = req.params;

    const salon = await User.findById(salonId).populate("professionals");
    if (!salon || salon.role !== "salon") {
      return res.status(404).json({ message: "Salon introuvable ou invalide." });
    }

    res.status(200).json({ professionals: salon.professionals });
  } catch (err) {
    console.error("Erreur récupération professionnels:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Mettre à jour un professionnel
const updateProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updated = await Professional.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Professionnel introuvable." });
    }

    res.status(200).json({ message: "Professionnel mis à jour.", professional: updated });
  } catch (err) {
    console.error("Erreur mise à jour professionnel:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Supprimer un professionnel et le retirer du salon
const deleteProfessional = async (req, res) => {
  try {
    const { id } = req.params;

    const professional = await Professional.findByIdAndDelete(id);
    if (!professional) {
      return res.status(404).json({ message: "Professionnel introuvable." });
    }

    // Retirer la référence du salon
    await User.updateOne(
      { professionals: id },
      { $pull: { professionals: id } }
    );

    res.status(200).json({ message: "Professionnel supprimé." });
  } catch (err) {
    console.error("Erreur suppression professionnel:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

module.exports = {
  createProfessional,
  getProfessionals,
  updateProfessional,
  deleteProfessional,
};
