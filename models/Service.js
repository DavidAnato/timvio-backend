const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  professional: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  duration: { 
    type: Number, 
    required: true, 
    min: 5 
  }, // durée en minutes
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  category: { 
    type: String 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

module.exports = mongoose.model("Service", serviceSchema); 