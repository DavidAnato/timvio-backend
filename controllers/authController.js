const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { sendOTPEmail, sendPasswordResetEmail } = require('../services/emailService');

// Création de compte
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, salonName } = req.body;

    // Validation des champs en fonction du rôle
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe sont obligatoires" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Format d'email invalide" });
    }

    // Validation spécifique au rôle
    if (role === 'client' && (!firstName || !lastName)) {
      return res.status(400).json({ message: "Prénom et nom sont obligatoires pour un client" });
    }

    if (role === 'salon' && !salonName) {
      return res.status(400).json({ message: "Le nom du salon est obligatoire" });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // Hashage du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Préparation des données utilisateur
    const userData = {
      email,
      password: hashedPassword,
      role: role || 'client',
      phone
    };

    // Ajouter les champs spécifiques au rôle
    if (role === 'client') {
      userData.firstName = firstName;
      userData.lastName = lastName;
      // Pour les clients, pas besoin de location obligatoire
    } else if (role === 'salon') {
      // Pour les salons, on utilise la structure nested 'salon.name'
      userData.salon = {
        name: salonName
      };
      
      // CORRECTION : Initialiser location avec des coordonnées par défaut
      // ou ne pas inclure location du tout si pas de géolocalisation
      // userData.location = {
      //   type: 'Point',
      //   coordinates: [0, 0] // [longitude, latitude] par défaut
      // };
    }

    // CORRECTION PRINCIPALE : Ne pas inclure location si pas de coordonnées
    // Le schéma a un index géospatial, mais le champ n'est pas required
    // Donc on peut créer des users sans location

    // Création de l'utilisateur
    const user = await User.create(userData);

    // Générer OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();

    // Sauvegarder OTP
    user.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // expire dans 10 minutes
    };
    await user.save();

    // Envoyer l'email
    const emailSent = await sendOTPEmail(email, otp);

    res.status(201).json({
      message: "Compte créé avec succès. Veuillez vérifier votre email pour activer votre compte.",
      userId: user._id,
      emailSent
    });

  } catch (error) {
    console.error('Erreur détaillée:', error);
    res.status(500).json({ 
      message: "Erreur lors de la création du compte", 
      error: error.message,
      // En développement seulement, retirer en production
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Nouvelle fonction pour vérifier l'OTP
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
      return res.status(400).json({ message: "Aucun code OTP n'a été généré" });
    }

    if (Date.now() > user.otp.expiresAt) {
      return res.status(400).json({ message: "Le code OTP a expiré" });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ message: "Code OTP invalide" });
    }

    // Valider le compte
    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Compte vérifié avec succès",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la vérification", error: error.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation des champs
    if (!email || !password) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Vérifier si le compte est activé
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: "Veuillez vérifier votre email pour activer votre compte",
        isVerified: false,
        userId: user._id
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la connexion", error: error.message });
  }
};

// Ajoutons aussi une fonction pour renvoyer l'OTP si nécessaire
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Ce compte est déjà vérifié" });
    }

    // Générer nouveau OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();

    // Mettre à jour OTP
    user.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // expire dans 10 minutes
    };
    await user.save();

    // Envoyer l'email
    const emailSent = await sendOTPEmail(user.email, otp);

    res.json({
      message: "Nouveau code OTP envoyé",
      emailSent
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'envoi du code OTP", error: error.message });
  }
};

// Demande de réinitialisation de mot de passe
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "L'email est requis" });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Aucun compte associé à cet email" });
    }

    // Générer OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();

    // Sauvegarder OTP
    user.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // expire dans 10 minutes
    };
    await user.save();

    // Envoyer l'email avec OTP
    const emailSent = await sendPasswordResetEmail(email, otp);

    res.json({
      message: "Instructions de réinitialisation envoyées par email",
      userId: user._id,
      emailSent
    });

  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation du mot de passe:", error);
    res.status(500).json({ 
      message: "Erreur lors de la demande de réinitialisation", 
      error: error.message, 
      details: error 
    });
  }
};

// Réinitialisation du mot de passe avec OTP
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        message: "Tous les champs sont requis" 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifier OTP
    if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
      return res.status(400).json({ message: "Aucun code OTP n'a été généré" });
    }

    if (Date.now() > user.otp.expiresAt) {
      return res.status(400).json({ message: "Le code OTP a expiré" });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ message: "Code OTP invalide" });
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Mettre à jour le mot de passe et supprimer l'OTP
    user.password = hashedPassword;
    user.otp = undefined;
    await user.save();

    res.json({
      message: "Mot de passe réinitialisé avec succès"
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la réinitialisation du mot de passe", 
      error: error.message 
    });
  }
};

// Changement de mot de passe
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId; // Récupéré du middleware d'authentification

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Le mot de passe actuel et le nouveau mot de passe sont requis"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifier le mot de passe actuel
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Mot de passe actuel incorrect" });
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Mettre à jour le mot de passe
    user.password = hashedPassword;
    await user.save();

    res.json({
      message: "Mot de passe modifié avec succès"
    });

  } catch (error) {
    res.status(500).json({
      message: "Erreur lors du changement de mot de passe",
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword
};
