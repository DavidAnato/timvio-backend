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
    location: {
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
        return this.role === 'provider';
      }
    },
    address: {
      street: String,
      city: {
        type: String,
        required: function() {
          return this.role === 'provider';
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

// Mise à jour des index pour inclure le nom du salon
userSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  'salon.name': 'text',
  'address.city': 1, 
  speciality: 1 
});

module.exports = mongoose.model("User", userSchema);