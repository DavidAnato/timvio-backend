const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 🔔 UserNotification model
 */
const userNotificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  object: {
    type: Schema.Types.Mixed, // pour stocker un objet JSON
    default: null,
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

userNotificationSchema.index({ created_at: -1 }); // pour le tri descendant par défaut


/**
 * 📱 NotificationToken model
 */
const notificationTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    default: 'android'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  }
});

// Index composé unique pour éviter les doublons
notificationTokenSchema.index({ user: 1, token: 1 }, { unique: true });

// Index pour la recherche par utilisateur
notificationTokenSchema.index({ user: 1, isActive: 1 });

// Middleware pour mettre à jour updated_at
notificationTokenSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

  

// 📦 Export des deux modèles
const UserNotification = mongoose.model('UserNotification', userNotificationSchema);
const NotificationToken = mongoose.model('NotificationToken', notificationTokenSchema);

module.exports = {
  UserNotification,
  NotificationToken,
};
