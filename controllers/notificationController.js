const { UserNotification, NotificationToken } = require('../models/Notification');
const sendPushNotification = require('../utils/sendPushNotification'); // à créer

// 🔔 Créer une notification + envoyer un push
const createNotification = async (req, res) => {
  const { recipientId, message, object, title = 'Nouvelle notification' } = req.body;

  try {
    // 1. Créer la notification en base
    const notification = await UserNotification.create({
      recipient: recipientId,
      message,
      object,
    });

    // 2. Récupérer tous les tokens de l’utilisateur
    const tokens = await NotificationToken.find({ user: recipientId });

    // 3. Envoyer le push à chaque token
    for (const { token } of tokens) {
      await sendPushNotification(token, title, message, object);
    }

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('❌ Erreur création notification :', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// 📥 Enregistrer un token Expo pour un utilisateur (sans doublon)
const saveNotificationToken = async (req, res) => {
    const { token } = req.body;
    const userId = req.user.userId;
  
    try {
      // Utiliser upsert pour éviter les erreurs de duplication
      const result = await NotificationToken.findOneAndUpdate(
        { user: userId, token }, // Critères de recherche
        { user: userId, token, updatedAt: new Date() }, // Données à mettre à jour
        { 
          upsert: true, // Créer si n'existe pas
          new: true,    // Retourner le document mis à jour
          setDefaultsOnInsert: true // Appliquer les valeurs par défaut lors de l'insertion
        }
      );
  
      console.log("✔️ result dans saveNotificationToken:", result);
      res.status(200).json({ 
        success: true, 
        message: 'Token enregistré avec succès',
        data: result
      });
    } catch (error) {
      console.error('❌ Erreur enregistrement token :', error);
      
      // Gestion spécifique de l'erreur de duplication
      if (error.code === 11000) {
        res.status(200).json({ 
          success: true, 
          message: 'Token déjà existant pour cet utilisateur' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Erreur serveur lors de l\'enregistrement du token' 
        });
      }
    }
  };
  
  
// 📋 Obtenir toutes les notifications d’un utilisateur
const getUserNotifications = async (req, res) => {
  const { userId } = req.params;

  try {
    const notifications = await UserNotification.find({ recipient: userId })
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('❌ Erreur récupération notifications :', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ✅ Marquer une notification comme lue
const markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;

  try {
    const notification = await UserNotification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification introuvable' });
    }

    notification.is_read = true;
    await notification.save();

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('❌ Erreur marquage comme lu :', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

module.exports = {
  createNotification,
  saveNotificationToken,
  getUserNotifications,
  markNotificationAsRead,
};
