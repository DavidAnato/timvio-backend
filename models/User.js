const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: function() {
        return this.role === 'client';
      }
    },
    lastName: { 
      type: String, 
      required: function() {
        return this.role === 'client';
      }
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ["client", "salon", "admin"], default: "client" },
    profilePicture: { type: String },
    isVerified: { type: Boolean, default: false },
    otp: {
      code: { type: String },
      expiresAt: { type: Date },
    },
    verificationToken: { type: String },

    // Champs spécifiques aux professionnels
    profession: { type: String },
    bio: { type: String },
    services: { type: [String], default: [] },
    
    // STRUCTURE CORRIGÉE POUR LA GÉOLOCALISATION
    location: {
      type: {
        type: String,
        enum: ['Point'],
        // CORRECTION : Ne pas avoir de default si le champ parent n'est pas requis
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        // L'index sera créé séparément
        validate: {
          validator: function(coords) {
            return coords && coords.length === 2;
          },
          message: 'Les coordonnées doivent être un tableau de 2 nombres [longitude, latitude]'
        }
      },
      // Garder les anciens champs pour compatibilité
      longitude: { type: String },
      latitude: { type: String },
    },

    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }],
    notifications: [{
      type: { type: String, enum: ["appointment", "payment", "reminder"] },
      message: { type: String },
      isRead: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    }],

    speciality: {
      type: String,
      required: function() {
        return this.role === 'salon';
      }
    },
    address: {
      street: String,
      city: {
        type: String,
        required: function() {
          return this.role === 'salon';
        }
      },
      postalCode: String,
      country: String
    },

    salon: {
      name: { 
        type: String,
        required: function() {
          return this.role === 'salon';
        }
      },
      description: String,
      images: { type: [String], default: [] }
    },
    stripeAccountId:{ type: String },
  },
  { timestamps: true }
);

// CORRECTION : Middleware pre-save pour gérer la géolocalisation
userSchema.pre('save', function(next) {
  // Si location est définie mais sans coordonnées valides, la supprimer
  if (this.location && (!this.location.coordinates || this.location.coordinates.length !== 2)) {
    this.location = undefined;
  }
  
  // Si location.coordinates existe, s'assurer que type est défini
  if (this.location && this.location.coordinates) {
    this.location.type = 'Point';
  }
  
  next();
});

// Index composé pour la recherche textuelle
userSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  'salon.name': 'text',
  bio: 'text',
  speciality: 'text'
}, {
  weights: {
    'salon.name': 10,
    firstName: 5,
    lastName: 5,
    speciality: 3,
    bio: 1
  }
});

// CORRECTION : Index géospatial conditionnel - seulement sur les documents qui ont location
userSchema.index({ 
  "location": "2dsphere" 
}, { 
  sparse: true // IMPORTANT : sparse=true pour ignorer les documents sans location
});

// Autres index utiles
userSchema.index({ 'address.city': 1, speciality: 1 });
userSchema.index({ role: 1, isVerified: 1 });
userSchema.index({ 'ratings.averageRating': -1 });

// Méthode helper pour ajouter la géolocalisation plus tard
userSchema.methods.setLocation = function(longitude, latitude) {
  this.location = {
    type: 'Point',
    coordinates: [parseFloat(longitude), parseFloat(latitude)]
  };
};

module.exports = mongoose.model("User", userSchema);