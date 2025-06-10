// models/Appointment.js - Modifications minimales

const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  salon: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: "Professional", required: true },
  date: { type: Date, required: true },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
  },
  status: { 
    type: String, 
    enum: ["pending", "confirmed", "completed", "canceled"], 
    default: "pending" 
  },
  notes: {
    type: String
  },
  // MODIFICATION : Étendre les statuts de paiement
  paymentStatus: { 
    type: String, 
    enum: ["pending", "partial", "paid", "refunded"], // Ajout de "partial"
    default: "pending" 
  },
  paymentId: {
    type: String
  },
  // AJOUT : Détails du paiement
  paymentDetails: {
    depositAmount: { type: Number }, // Montant de l'acompte
    totalAmount: { type: Number },   // Montant total
    remainingAmount: { type: Number }, // Montant restant
    paymentType: { 
      type: String, 
      enum: ["deposit", "on_site", "full"],
      default: "on_site"
    }
  }
}, { timestamps: true });

// AJOUT : Méthode pour calculer les montants
appointmentSchema.methods.calculatePaymentAmounts = function(servicePrice) {
  const depositAmount = Math.round(servicePrice * 0.30);
  const totalAmount = servicePrice;
  const remainingAmount = totalAmount - (this.paymentStatus === 'partial' ? depositAmount : 0);
  
  this.paymentDetails.depositAmount = depositAmount;
  this.paymentDetails.totalAmount = totalAmount;
  this.paymentDetails.remainingAmount = remainingAmount;
};

module.exports = mongoose.model("Appointment", appointmentSchema);