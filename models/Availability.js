const mongoose = require("mongoose");

// Schema de base pour les disponibilités (partagé entre salon et professionnel)
const baseAvailabilitySchema = {
  availability: [{
      dayOfWeek: { 
          type: Number, 
          min: 0, 
          max: 6,
          required: true 
      },
      isAvailable: { 
          type: Boolean, 
          default: true 
      },
      timeSlots: [{
          startTime: {
              type: String,
              match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/,
              required: true,
          },
          endTime: {
              type: String,
              match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/,
              required: true,
          },
      }],
  }],
  exceptions: [{
      date: { 
          type: Date, 
          required: true 
      },
      isAvailable: { 
          type: Boolean, 
          default: false 
      },
      reason: {
          type: String
      }
  }],
  blockedSlots: [{
      date: { 
          type: Date, 
          required: true 
      },
      startTime: {
          type: String,
          match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/,
      },
      endTime: {
          type: String,
          match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/,
      },
      reason: {
          type: String
      }
  }],
};

// Modèle Availability pour les salons
const availabilitySchema = new mongoose.Schema({
  salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
  },
  ...baseAvailabilitySchema
}, { timestamps: true });

// Index pour optimiser les recherches
availabilitySchema.index({ salon: 1 });
availabilitySchema.index({ 'exceptions.date': 1 });
availabilitySchema.index({ 'blockedSlots.date': 1 });

// Middleware pour propager les changements aux professionnels
availabilitySchema.post('save', async function(doc, next) {
    try {
        // Mettre à jour tous les professionnels du salon qui héritent des disponibilités
        await mongoose.model('ProfessionalAvailability').updateMany(
            { salon: doc.salon, inheritFromSalon: true },
            {
                $set: {
                    availability: doc.availability,
                    exceptions: doc.exceptions,
                    blockedSlots: doc.blockedSlots
                }
            }
        );
        next();
    } catch (error) {
        next(error);
    }
});

// Modèle Availability pour les professionnels
const professionalAvailabilitySchema = new mongoose.Schema({
  professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Professional",
      required: true,
  },
  salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
  },
  // Hérite des disponibilités du salon par défaut
  inheritFromSalon: {
      type: Boolean,
      default: true
  },
  // Les mêmes champs que le salon
  ...baseAvailabilitySchema
}, { timestamps: true });

// Index pour optimiser les recherches
professionalAvailabilitySchema.index({ professional: 1 });
professionalAvailabilitySchema.index({ salon: 1 });
professionalAvailabilitySchema.index({ 'exceptions.date': 1 });
professionalAvailabilitySchema.index({ 'blockedSlots.date': 1 });

// Méthode pour vérifier la disponibilité
professionalAvailabilitySchema.methods.isAvailableAt = async function(date, startTime, endTime) {
  // 1. Vérifier les exceptions du professionnel
  const hasProfessionalException = this.exceptions.some(exception => {
      const exceptionDate = new Date(exception.date);
      const checkDate = new Date(date);
      return exceptionDate.toDateString() === checkDate.toDateString() && !exception.isAvailable;
  });
  
  if (hasProfessionalException) return false;
  
  // 2. Vérifier les créneaux bloqués du professionnel
  const hasProfessionalBlockedSlot = this.blockedSlots.some(slot => {
      const slotDate = new Date(slot.date);
      const checkDate = new Date(date);
      return slotDate.toDateString() === checkDate.toDateString() &&
             ((startTime >= slot.startTime && startTime < slot.endTime) ||
              (endTime > slot.startTime && endTime <= slot.endTime) ||
              (startTime <= slot.startTime && endTime >= slot.endTime));
  });
  
  if (hasProfessionalBlockedSlot) return false;
  
  // 3. Vérifier les disponibilités générales
  const dayOfWeek = new Date(date).getDay();
  const daySchedule = this.availability.find(avail => avail.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.isAvailable) return false;
  
  // 4. Vérifier si le créneau demandé est dans les plages horaires disponibles
  return daySchedule.timeSlots.some(slot => 
      startTime >= slot.startTime && endTime <= slot.endTime
  );
};

// Méthode pour obtenir tous les créneaux bloqués
professionalAvailabilitySchema.methods.getAllBlockedSlots = function(date) {
  const blockedSlots = [];
  const checkDate = new Date(date);
  
  // Ajouter les créneaux bloqués du professionnel
  this.blockedSlots.forEach(slot => {
      const slotDate = new Date(slot.date);
      if (slotDate.toDateString() === checkDate.toDateString()) {
          blockedSlots.push({
              ...slot.toObject(),
              source: 'professional'
          });
      }
  });
  
  return blockedSlots;
};

module.exports = {
  Availability: mongoose.model("Availability", availabilitySchema),
  ProfessionalAvailability: mongoose.model("ProfessionalAvailability", professionalAvailabilitySchema),
};