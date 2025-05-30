const cron = require('node-cron');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const {NotificationToken} = require('../models/Notification');
const sendPushNotification = require('../utils/sendPushNotification');
const { sendEmailNotification } = require('../utils/sendEmailNotification');

class AppointmentNotificationService {
  constructor() {
    this.isRunning = false;
    this.scheduledJobs = new Map();
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Service de notifications déjà en cours');
      return;
    }

    console.log('🚀 Démarrage du service de notifications push et email...');
    
    // Vérification toutes les minutes
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkUpcomingAppointments();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;
    console.log('✅ Service de notifications démarré - Vérification chaque minute');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('🛑 Service de notifications arrêté');
    }
  }

  async checkUpcomingAppointments() {
    try {
      const now = new Date();
      console.log(`🔍 [${now.toLocaleTimeString()}] Vérification des RDV...`);

      // Chercher tous les rendez-vous confirmés/pending dans les prochains jours
      const upcomingAppointments = await Appointment.find({
        status: { $in: ['confirmed', 'pending'] },
        date: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      })
      .populate('client', 'firstName lastName email')
      .populate('salon', 'salon.name email firstName lastName')
      .populate('service', 'name duration price')
      .populate('professional', 'firstName lastName');

      console.log(`📋 ${upcomingAppointments.length} rendez-vous trouvés`);

      const appointmentsToNotify = [];
      const appointmentsToNotifyNow = [];

      for (const appointment of upcomingAppointments) {
        const appointmentDateTime = this.getAppointmentDateTime(appointment);
        const minutesUntil = Math.round((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60));
        const jobKey = appointment._id.toString();
        
        console.log(`🕒 RDV ${appointment._id}:`);
        console.log(`   📅 DateTime: ${appointmentDateTime.toLocaleString()}`);
        console.log(`   ⏰ Dans ${minutesUntil} minutes`);

        // Rappels 10 minutes avant
        if (minutesUntil >= 9 && minutesUntil <= 11 && !this.scheduledJobs.has(jobKey + '_reminder')) {
          appointmentsToNotify.push(appointment);
          console.log(`   🎯 À notifier (rappel 10 min)`);
        }
        
        // Notifications immédiates
        if (minutesUntil >= -1 && minutesUntil <= 1 && !this.scheduledJobs.has(jobKey + '_now')) {
          appointmentsToNotifyNow.push(appointment);
          console.log(`   🚨 À notifier (RDV maintenant)`);
        }
      }

      // Envoyer les rappels
      for (const appointment of appointmentsToNotify) {
        console.log(`📤 Envoi rappel pour RDV ${appointment._id}...`);
        await this.sendAppointmentReminder(appointment, 'reminder');
        this.scheduledJobs.set(appointment._id.toString() + '_reminder', Date.now());
      }

      // Envoyer les notifications immédiates
      for (const appointment of appointmentsToNotifyNow) {
        console.log(`📤 Envoi notification immédiate pour RDV ${appointment._id}...`);
        await this.sendAppointmentReminder(appointment, 'now');
        this.scheduledJobs.set(appointment._id.toString() + '_now', Date.now());
      }

      const totalNotifications = appointmentsToNotify.length + appointmentsToNotifyNow.length;
      if (totalNotifications > 0) {
        console.log(`📱 ${appointmentsToNotify.length} rappel(s) et ${appointmentsToNotifyNow.length} notification(s) immédiate(s) envoyée(s)`);
      } else {
        console.log(`😴 Aucune notification à envoyer`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la vérification des rendez-vous:', error);
    }
  }

  getAppointmentDateTime(appointment) {
    try {
      const appointmentDate = new Date(appointment.date);
      const [hours, minutes] = appointment.startTime.split(':').map(Number);
      
      const dateTime = new Date(appointmentDate);
      dateTime.setHours(hours, minutes, 0, 0);
      
      return dateTime;
    } catch (error) {
      console.error(`❌ Erreur conversion date pour RDV ${appointment._id}:`, error);
      return new Date();
    }
  }

  /**
   * Génère le contenu HTML de l'email de notification
   * @param {Object} appointment - Rendez-vous
   * @param {string} type - Type de notification ('reminder' ou 'now')
   * @param {string} role - Rôle du destinataire ('client' ou 'salon')
   * @returns {string} Contenu HTML
   */
  generateEmailContent(appointment, type, role) {
    const appointmentDateTime = this.getAppointmentDateTime(appointment);
    const serviceName = appointment.service?.name || 'Service';
    const professionalName = appointment.professional ? 
      `${appointment.professional.firstName} ${appointment.professional.lastName}` : 'Professionnel';
    
    const isReminder = type === 'reminder';
    const isClient = role === 'client';
    
    const title = isReminder ? 
      (isClient ? '⏰ Rappel de votre rendez-vous' : '⏰ Rendez-vous imminent') :
      (isClient ? '🚨 Votre rendez-vous commence !' : '🚨 Rendez-vous en cours');
    
    const timeText = isReminder ? 'dans 10 minutes' : 'maintenant';
    
    const clientName = `${appointment.client.firstName} ${appointment.client.lastName}`;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: ${isReminder ? '#4CAF50' : '#FF5722'}; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .appointment-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #666; }
            .detail-value { color: #333; }
            .footer { background: #f5f5f5; padding: 15px; text-align: center; color: #666; font-size: 12px; }
            .urgent { color: ${isReminder ? '#4CAF50' : '#FF5722'}; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${title}</h1>
            </div>
            <div class="content">
              <p>
                ${isClient ? 
                  `Bonjour ${clientName},` : 
                  `Bonjour,`
                }
              </p>
              
              <p class="urgent">
                ${isClient ?
                  `Votre rendez-vous "${serviceName}" avec ${professionalName} commence ${timeText}.` :
                  `Le rendez-vous avec ${clientName} pour "${serviceName}" commence ${timeText}.`
                }
              </p>
              
              <div class="appointment-details">
                <div class="detail-row">
                  <span class="detail-label">📅 Date :</span>
                  <span class="detail-value">${appointmentDateTime.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🕒 Heure :</span>
                  <span class="detail-value">${appointment.startTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">💼 Service :</span>
                  <span class="detail-value">${serviceName}</span>
                </div>
                ${appointment.service?.duration ? `
                <div class="detail-row">
                  <span class="detail-label">⏱️ Durée :</span>
                  <span class="detail-value">${appointment.service.duration} minutes</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">${isClient ? '👤 Professionnel :' : '👤 Client :'}</span>
                  <span class="detail-value">${isClient ? professionalName : clientName}</span>
                </div>
                ${appointment.service?.price ? `
                <div class="detail-row">
                  <span class="detail-label">💰 Prix :</span>
                  <span class="detail-value">${appointment.service.price} €</span>
                </div>
                ` : ''}
              </div>
              
              <p>
                ${isClient ? 
                  (isReminder ? 
                    'Nous vous rappelons de vous préparer pour votre rendez-vous.' : 
                    'Votre rendez-vous commence maintenant. Nous espérons que vous êtes prêt(e) !'
                  ) :
                  (isReminder ?
                    'Préparez-vous à accueillir votre client dans quelques minutes.' :
                    'Votre client devrait arriver maintenant.'
                  )
                }
              </p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement par le système de gestion des rendez-vous.</p>
              <p>Merci de ne pas répondre à cet email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Récupère tous les tokens de notification actifs pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<string[]>} Liste des tokens
   */
  async getNotificationTokens(userId) {
    try {
      if (!userId) {
        console.log('❌ ID utilisateur manquant');
        return [];
      }

      // Chercher tous les tokens actifs pour cet utilisateur
      const tokenDocs = await NotificationToken.find({ 
        user: userId, 
        isActive: true 
      }).select('token platform created_at');

      const tokens = tokenDocs.map(doc => doc.token);
      
      console.log(`📱 Utilisateur ${userId}: ${tokens.length} token(s) actif(s) trouvé(s)`);
      
      // Log détaillé des tokens trouvés
      if (tokenDocs.length > 0) {
        tokenDocs.forEach((doc, index) => {
          console.log(`   Token ${index + 1}: ${doc.token.substring(0, 20)}... (${doc.platform})`);
        });
      }

      return tokens;
    } catch (error) {
      console.error(`❌ Erreur récupération tokens pour user ${userId}:`, error);
      return [];
    }
  }

  async sendAppointmentReminder(appointment, type = 'reminder') {
    const appointmentTime = appointment.startTime;
    const serviceName = appointment.service?.name || 'Service';
    const professionalName = appointment.professional ? 
      `${appointment.professional.firstName} ${appointment.professional.lastName}` : 'Professionnel';

    console.log(`🚀 Envoi notifications (${type}) pour RDV ${appointment._id}:`);

    try {
      // Messages selon le type
      let clientTitle, clientBody, salonTitle, salonBody;
      
      if (type === 'reminder') {
        clientTitle = '⏰ Rappel de rendez-vous';
        clientBody = `Votre rendez-vous "${serviceName}" avec ${professionalName} commence dans 10 minutes (${appointmentTime})`;
        salonTitle = '⏰ Rendez-vous imminent';
        salonBody = `Le rendez-vous avec ${appointment.client.firstName} ${appointment.client.lastName} pour "${serviceName}" commence dans 10 minutes (${appointmentTime})`;
      } else {
        clientTitle = '🚨 Votre rendez-vous commence !';
        clientBody = `Votre rendez-vous "${serviceName}" avec ${professionalName} commence maintenant (${appointmentTime})`;
        salonTitle = '🚨 Rendez-vous en cours';
        salonBody = `Le rendez-vous avec ${appointment.client.firstName} ${appointment.client.lastName} pour "${serviceName}" commence maintenant (${appointmentTime})`;
      }

      let notificationsSent = 0;
      let emailsSent = 0;

      // Notification au client
      if (appointment.client?._id) {
        console.log(`👤 Notification au client: ${appointment.client.firstName} ${appointment.client.lastName}`);
        
        // Push notifications
        const clientTokens = await this.getNotificationTokens(appointment.client._id);
        
        if (clientTokens.length > 0) {
          for (const token of clientTokens) {
            try {
              await sendPushNotification(
                token,
                clientTitle,
                clientBody,
                {
                  type: type === 'reminder' ? 'appointment_reminder' : 'appointment_now',
                  appointmentId: appointment._id.toString(),
                  role: 'client'
                }
              );
              console.log(`✅ Notification push client envoyée: ${token.substring(0, 20)}...`);
              notificationsSent++;
            } catch (error) {
              console.error(`❌ Erreur envoi token client ${token.substring(0, 20)}...:`, error);
              // Marquer le token comme inactif si erreur d'envoi
              await this.markTokenAsInactive(token);
            }
          }
        } else {
          console.log(`❌ Aucun token push actif pour le client: ${appointment.client.firstName} ${appointment.client.lastName}`);
        }

        // Email notification
        if (appointment.client.email) {
          try {
            const emailContent = this.generateEmailContent(appointment, type, 'client');
            const emailSent = await sendEmailNotification(
              appointment.client.email,
              clientTitle,
              emailContent
            );
            
            if (emailSent) {
              console.log(`✅ Email client envoyé: ${appointment.client.email}`);
              emailsSent++;
            } else {
              console.log(`❌ Erreur envoi email client: ${appointment.client.email}`);
            }
          } catch (error) {
            console.error(`❌ Erreur envoi email client:`, error);
          }
        } else {
          console.log(`❌ Pas d'email pour le client: ${appointment.client.firstName} ${appointment.client.lastName}`);
        }
      }

      // Notification au salon
      if (appointment.salon?._id) {
        console.log(`🏢 Notification au salon: ${appointment.salon.firstName || appointment.salon.salon?.name}`);
        
        // Push notifications
        const salonTokens = await this.getNotificationTokens(appointment.salon._id);
        
        if (salonTokens.length > 0) {
          for (const token of salonTokens) {
            try {
              await sendPushNotification(
                token,
                salonTitle,
                salonBody,
                {
                  type: type === 'reminder' ? 'appointment_reminder' : 'appointment_now',
                  appointmentId: appointment._id.toString(),
                  role: 'salon'
                }
              );
              console.log(`✅ Notification push salon envoyée: ${token.substring(0, 20)}...`);
              notificationsSent++;
            } catch (error) {
              console.error(`❌ Erreur envoi token salon ${token.substring(0, 20)}...:`, error);
              // Marquer le token comme inactif si erreur d'envoi
              await this.markTokenAsInactive(token);
            }
          }
        } else {
          console.log(`❌ Aucun token push actif pour le salon`);
        }

        // Email notification
        const salonEmail = appointment.salon.email;
        if (salonEmail) {
          try {
            const emailContent = this.generateEmailContent(appointment, type, 'salon');
            const emailSent = await sendEmailNotification(
              salonEmail,
              salonTitle,
              emailContent
            );
            
            if (emailSent) {
              console.log(`✅ Email salon envoyé: ${salonEmail}`);
              emailsSent++;
            } else {
              console.log(`❌ Erreur envoi email salon: ${salonEmail}`);
            }
          } catch (error) {
            console.error(`❌ Erreur envoi email salon:`, error);
          }
        } else {
          console.log(`❌ Pas d'email pour le salon`);
        }
      }

      console.log(`📊 Total notifications envoyées: ${notificationsSent} push + ${emailsSent} emails`);

      // Mise à jour du rendez-vous
      await Appointment.findByIdAndUpdate(appointment._id, {
        $push: {
          notifications: {
            type: type === 'reminder' ? 'reminder_sent' : 'immediate_notification_sent',
            sentAt: new Date(),
            message: `${type === 'reminder' ? 'Rappel 10 minutes' : 'Notification immédiate'} envoyé (${notificationsSent} push + ${emailsSent} emails)`
          }
        }
      });

    } catch (error) {
      console.error(`❌ Erreur envoi notification (${type}) pour RDV ${appointment._id}:`, error);
    }
  }

  /**
   * Marque un token comme inactif en cas d'erreur d'envoi
   * @param {string} token - Token à désactiver
   */
  async markTokenAsInactive(token) {
    try {
      await NotificationToken.updateOne(
        { token: token },
        { $set: { isActive: false, updated_at: new Date() } }
      );
      console.log(`⚠️ Token marqué comme inactif: ${token.substring(0, 20)}...`);
    } catch (error) {
      console.error(`❌ Erreur marquage token inactif:`, error);
    }
  }

  /**
   * Nettoie les tokens inactifs anciens (plus de 30 jours)
   */
  async cleanupInactiveTokens() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await NotificationToken.deleteMany({
        isActive: false,
        updated_at: { $lt: thirtyDaysAgo }
      });
      
      if (result.deletedCount > 0) {
        console.log(`🧹 ${result.deletedCount} tokens inactifs supprimés`);
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage tokens:', error);
    }
  }

  cleanupProcessedJobs() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let cleaned = 0;
    
    for (const [key, timestamp] of this.scheduledJobs.entries()) {
      if (timestamp < oneDayAgo) {
        this.scheduledJobs.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} anciens jobs nettoyés`);
    }
  }
}

// Instance singleton
const notificationService = new AppointmentNotificationService();

module.exports = {
  notificationService,
  
  initializeNotificationService: () => {
    notificationService.start();
    
    // Nettoyage périodique toutes les 6 heures
    cron.schedule('0 */6 * * *', () => {
      notificationService.cleanupProcessedJobs();
      notificationService.cleanupInactiveTokens();
    });
  },

  stopNotificationService: () => {
    notificationService.stop();
  },

  checkUserTokens: async (userId) => {
    return notificationService.getNotificationTokens(userId);
  },

  /**
   * Ajoute ou met à jour un token de notification pour un utilisateur
   */
  addNotificationToken: async (userId, token, platform = 'android') => {
    try {
      if (!userId || !token) {
        console.error('❌ userId et token requis');
        return false;
      }

      const result = await NotificationToken.findOneAndUpdate(
        { user: userId, token: token },
        { 
          user: userId, 
          token: token, 
          platform: platform,
          isActive: true,
          updated_at: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Token ajouté/mis à jour pour user ${userId}: ${token.substring(0, 20)}...`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur ajout token pour user ${userId}:`, error);
      return false;
    }
  },

  /**
   * Supprime un token de notification
   */
  removeNotificationToken: async (userId, token) => {
    try {
      const result = await NotificationToken.deleteOne({ user: userId, token: token });
      
      if (result.deletedCount > 0) {
        console.log(`✅ Token supprimé pour user ${userId}: ${token.substring(0, 20)}...`);
        return true;
      } else {
        console.log(`⚠️ Token non trouvé pour suppression: ${token.substring(0, 20)}...`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Erreur suppression token pour user ${userId}:`, error);
      return false;
    }
  },

  /**
   * Supprime tous les tokens d'un utilisateur
   */
  removeAllUserTokens: async (userId) => {
    try {
      const result = await NotificationToken.deleteMany({ user: userId });
      console.log(`✅ ${result.deletedCount} token(s) supprimé(s) pour user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur suppression tokens pour user ${userId}:`, error);
      return false;
    }
  },

  /**
   * Test d'envoi de notification (push + email)
   */
  testNotification: async (userId, title = 'Test', body = 'Notification de test') => {
    try {
      const tokens = await notificationService.getNotificationTokens(userId);
      
      // Test push notifications
      let pushSent = 0;
      for (const token of tokens) {
        try {
          await sendPushNotification(token, title, body, { type: 'test' });
          pushSent++;
          console.log(`✅ Test push envoyé: ${token.substring(0, 20)}...`);
        } catch (error) {
          console.error(`❌ Erreur test token ${token.substring(0, 20)}...:`, error);
        }
      }

      // Test email (il faudrait récupérer l'email de l'utilisateur)
      let emailSent = 0;
      try {
        const user = await User.findById(userId).select('email firstName lastName');
        if (user && user.email) {
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="background: #2196F3; color: white; padding: 20px; text-align: center;">
                <h1>${title}</h1>
              </div>
              <div style="padding: 30px;">
                <p>Bonjour ${user.firstName} ${user.lastName},</p>
                <p>${body}</p>
                <p>Ceci est un email de test du système de notifications.</p>
              </div>
              <div style="background: #f5f5f5; padding: 15px; text-align: center; color: #666; font-size: 12px;">
                <p>Cet email a été envoyé automatiquement par le système de gestion des rendez-vous.</p>
              </div>
            </div>
          `;
          
          const result = await sendEmailNotification(user.email, title, emailContent);
          if (result) {
            emailSent = 1;
            console.log(`✅ Test email envoyé: ${user.email}`);
          }
        }
      } catch (error) {
        console.error(`❌ Erreur test email pour user ${userId}:`, error);
      }

      console.log(`📊 Test terminé: ${pushSent}/${tokens.length} push + ${emailSent} email envoyé(s)`);
      return pushSent > 0 || emailSent > 0;
    } catch (error) {
      console.error(`❌ Erreur test notification pour user ${userId}:`, error);
      return false;
    }
  }
};