const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
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
  paymentStatus: { 
    type: String, 
    enum: ["pending", "paid", "refunded"], 
    default: "pending" 
  },
  paymentId: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);