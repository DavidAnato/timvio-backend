const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["pending", "completed", "failed"], 
    default: "pending" 
  },
  paymentMethod: { 
    type: String, 
    enum: ["card", "paypal", "mobile_money"], 
    required: true 
  },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);