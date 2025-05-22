const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, 
          required: function() {
          return this.role === 'client';
        }
     },
    lastName: { type: String, 
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
    services: [{ type: String }],
    
    // STRUCTURE MISE À JOUR POUR LA GÉOLOCALISATION
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      },
      // Garder les anciens champs pour compatibilité
      longitude: { type: String },
      latitude: { type: String },
    },

    ratings: {
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
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
      images: [String]
    },
    professionals: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Professional",
    }],
  },
  { timestamps: true }
);

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

// Index géospatial sur location.coordinates
userSchema.index({ "location": "2dsphere" });

// Autres index utiles
userSchema.index({ 'address.city': 1, speciality: 1 });
userSchema.index({ role: 1, isVerified: 1 });
userSchema.index({ 'ratings.averageRating': -1 });

module.exports = mongoose.model("User", userSchema);
