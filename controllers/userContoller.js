const User = require('../models/User');

/**
 * @desc Récupérer le profil de l'utilisateur
 * @route GET /api/users/profile
 * @access Private
 */
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select("-password -otp -verificationToken");
        
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ 
            message: "Erreur lors de la récupération du profil", 
            error: error.message 
        });
    }
};

/**
 * @desc Mettre à jour le profil de l'utilisateur
 * @route PATCH /api/users/profile
 * @access Private
 */
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const updates = req.body;
        
        // Empêcher la mise à jour de certains champs sensibles
        const forbiddenFields = ["password", "role", "isVerified", "otp", "verificationToken"];
        forbiddenFields.forEach(field => {
            if (updates[field]) delete updates[field];
        });
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        
        // Gestion des mises à jour selon le rôle
        if (user.role === "salon") {
            // Pour les professionnels, gérer les mises à jour du salon
            if (updates.salon) {
                user.salon = { ...user.salon, ...updates.salon };
                delete updates.salon;
            }
        } else if (user.role === "client") {
            // Pour les clients, supprimer les champs réservés aux professionnels
            delete updates.salon;
            delete updates.speciality;
            delete updates.profession;
        }
        
        // Mise à jour des autres champs
        Object.keys(updates).forEach(key => {
            if (key === "address") {
                user[key] = { ...user[key], ...updates[key] };
            } else if (key === "profilePicture") {
                // Validation de l'URL de l'image
                if (!updates[key].startsWith('http')) {
                    throw new Error("L'URL de l'image doit commencer par http");
                }
                user[key] = updates[key];
            } else {
                user[key] = updates[key];
            }
        });
        
        await user.save();
        
        // Retourner l'utilisateur mis à jour sans les champs sensibles
        const updatedUser = await User.findById(userId).select("-password -otp -verificationToken");
        
        res.status(200).json({
            message: "Profil mis à jour avec succès",
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Erreur lors de la mise à jour du profil", 
            error: error.message 
        });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile
};