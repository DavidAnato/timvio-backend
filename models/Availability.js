const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    professional: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Lien vers le pro
    availability: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Dimanche, 6 = Samedi
        startTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/ },
        endTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/ },
        isAvailable: { type: Boolean, default: true },
      }
    ],
    exceptions: [
      {
        date: { type: Date, required: true },
        isAvailable: { type: Boolean, default: false },
      }
    ],
    blockedSlots: [
      {
        date: { type: Date, required: true },
        startTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/ },
        endTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/ },
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Availability", availabilitySchema);
