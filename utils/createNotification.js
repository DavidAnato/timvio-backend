const { UserNotification, NotificationToken } = require('../models/Notification');
const sendPushNotification = require('./sendPushNotification');
const { sendEmailNotification } = require('./sendEmailNotification');
const User = require('../models/User');

/**
 * 📧 Générer le template HTML stylé pour l'email
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {Object} additionalData - Données supplémentaires (optionnel)
 * @param {string} userFirstName - Prénom de l'utilisateur
 * @returns {string} - HTML stylé
 */
const generateEmailTemplate = (title, message, additionalData = null, userFirstName = '') => {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f5f7fa;
            }
            
            .email-container {
                max-width: 600px;
                margin: 20px auto;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px 20px;
                text-align: center;
                color: white;
            }
            
            .header h1 {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .header .icon {
                font-size: 32px;
                margin-bottom: 12px;
                display: block;
            }
            
            .content {
                padding: 30px;
            }
            
            .greeting {
                font-size: 16px;
                color: #666;
                margin-bottom: 20px;
            }
            
            .message-box {
                background: #f8f9ff;
                border-left: 4px solid #667eea;
                padding: 20px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
            }
            
            .message-text {
                font-size: 16px;
                line-height: 1.6;
                color: #444;
            }
            
            .additional-data {
                background: #f1f3f4;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                color: #555;
                overflow-x: auto;
            }
            
            .additional-data-title {
                font-weight: bold;
                color: #333;
                margin-bottom: 10px;
                font-family: 'Segoe UI', sans-serif;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }
            
            .footer-text {
                color: #6c757d;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .timestamp {
                color: #999;
                font-size: 12px;
                font-style: italic;
            }
            
            .divider {
                height: 1px;
                background: linear-gradient(to right, transparent, #ddd, transparent);
                margin: 20px 0;
            }
            
            @media (max-width: 600px) {
                .email-container {
                    margin: 10px;
                    border-radius: 8px;
                }
                
                .header {
                    padding: 20px 15px;
                }
                
                .content {
                    padding: 20px 15px;
                }
                
                .header h1 {
                    font-size: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="icon">🔔</div>
                <h1>${title}</h1>
            </div>
            
            <div class="content">
                ${userFirstName ? `<div class="greeting">Bonjour <strong>${userFirstName}</strong>,</div>` : ''}
                
                <div class="message-box">
                    <div class="message-text">${message}</div>
                </div>
                
                ${additionalData ? `
                    <div class="divider"></div>
                    <div class="additional-data">
                        <div class="additional-data-title">📋 Informations supplémentaires :</div>
                        <pre>${JSON.stringify(additionalData, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
            
            <div class="footer">
                <div class="footer-text">Cette notification a été générée automatiquement</div>
                <div class="timestamp">Envoyé le ${new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</div>
            </div>
        </div>
    </body>
    </html>
  `;
};

/**
 * 🔔 Créer une notification et l'envoyer via push et email
 * @param {string} title - Titre de la notification
 * @param {string|Array} userId - ID de l'utilisateur ou tableau d'IDs
 * @param {string} message - Message de la notification
 * @param {Object} additionalData - Données supplémentaires (optionnel)
 * @returns {Promise<Object>}
 */
const createNotification = async (title, message, userId, additionalData = null) => {
  try {
    const userIds = Array.isArray(userId) ? userId : [userId];
    const notifications = [];
    const pushResults = [];
    const emailResults = [];

    for (const id of userIds) {
      const user = await User.findById(id);
      if (!user) {
        console.warn(`⚠️ Utilisateur non trouvé : ${id}`);
        continue;
      }

      // 1. Enregistrement BDD
      const notification = await UserNotification.create({
        recipient: id,
        message,
        object: additionalData,
        is_read: false,
        created_at: new Date(),
      });
      notifications.push(notification);

      // 2. Notification Push
      const userTokens = await NotificationToken.find({ 
        user: id,
        token: { $exists: true, $ne: null }
      });

      for (const tokenDoc of userTokens) {
        try {
          const pushResult = await sendPushNotification(
            tokenDoc.token, 
            title, 
            message,
            additionalData
          );

          pushResults.push({
            userId: id,
            token: tokenDoc.token,
            success: true,
            result: pushResult
          });

          console.log(`✅ Push envoyé à ${user.email || user.firstName} (${tokenDoc.token.slice(0, 20)}...)`);
        } catch (pushError) {
          console.error(`❌ Erreur push pour ${user.email || user.firstName}:`, pushError.message);

          pushResults.push({
            userId: id,
            token: tokenDoc.token,
            success: false,
            error: pushError.message
          });

          if (
            pushError.message.includes('InvalidCredentials') || 
            pushError.message.includes('DeviceNotRegistered')
          ) {
            await NotificationToken.deleteOne({ _id: tokenDoc._id });
            console.log(`🗑️ Token supprimé: ${tokenDoc.token.slice(0, 20)}...`);
          }
        }
      }

      if (userTokens.length === 0) {
        console.log(`ℹ️ Aucun token push pour ${user.email || user.firstName}`);
      }

      // 3. Notification Email avec template stylé
      if (user.email) {
        const htmlContent = generateEmailTemplate(
          title, 
          message, 
          additionalData, 
          user.firstName
        );
        
        const emailSent = await sendEmailNotification(user.email, title, htmlContent);
        emailResults.push({
          userId: id,
          email: user.email,
          success: emailSent
        });

        if (emailSent) {
          console.log(`📧 Email stylé envoyé à ${user.email}`);
        } else {
          console.warn(`❌ Échec envoi email à ${user.email}`);
        }
      } else {
        console.warn(`⚠️ Aucun email défini pour ${user.firstName} (${id})`);
      }
    }

    return {
      success: true,
      message: `${notifications.length} notification(s) créée(s)`,
      notifications,
      pushResults: {
        total: pushResults.length,
        successful: pushResults.filter(r => r.success).length,
        failed: pushResults.filter(r => !r.success).length,
        details: pushResults,
      },
      emailResults: {
        total: emailResults.length,
        successful: emailResults.filter(e => e.success).length,
        failed: emailResults.filter(e => !e.success).length,
        details: emailResults,
      }
    };
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    throw new Error(`Erreur lors de la notification : ${error.message}`);
  }
};

/**
 * 🔔 Créer une notification pour tous les utilisateurs
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {Object} options - Options pour filtrer les utilisateurs
 * @returns {Promise<Object>} - Résultat de l'opération
 */
const createNotificationForAll = async (title, message, options = {}) => {
    try {
        const { role, isVerified = true, excludeUserIds = [] } = options;
        
        // Construire la requête de filtrage
        const query = { isVerified };
        if (role) query.role = role;
        if (excludeUserIds.length > 0) query._id = { $nin: excludeUserIds };

        // Récupérer tous les utilisateurs correspondants
        const users = await User.find(query, '_id');
        const userIds = users.map(user => user._id.toString());

        if (userIds.length === 0) {
            return {
                success: true,
                message: 'Aucun utilisateur trouvé avec les critères spécifiés',
                notifications: [],
                pushResults: { total: 0, successful: 0, failed: 0, details: [] }
            };
        }

        // Utiliser la fonction principale pour envoyer à tous
        return await createNotification(title, message, userIds);

    } catch (error) {
        console.error('❌ Erreur lors de la création des notifications globales:', error);
        throw new Error(`Erreur lors de la création des notifications globales: ${error.message}`);
    }
};

/**
 * 🔔 Marquer une notification comme lue
 * @param {string} notificationId - ID de la notification
 * @param {string} userId - ID de l'utilisateur (pour vérification)
 * @returns {Promise<Object>} - Notification mise à jour
 */
const markNotificationAsRead = async (notificationId, userId) => {
    try {
        const notification = await UserNotification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { is_read: true },
            { new: true }
        );

        if (!notification) {
            throw new Error('Notification non trouvée ou non autorisée');
        }

        return {
            success: true,
            notification: notification
        };
    } catch (error) {
        console.error('❌ Erreur lors du marquage de la notification:', error);
        throw error;
    }
};

module.exports = {
    createNotification,
    createNotificationForAll,
    markNotificationAsRead,
    generateEmailTemplate // Export pour utilisation externe si nécessaire
};