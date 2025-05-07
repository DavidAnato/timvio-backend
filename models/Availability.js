const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    availability: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Dimanche, 6 = Samedi
        slots: [
          {
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
            isAvailable: { type: Boolean, default: true },
          },
        ],
      },
    ],
    exceptions: [
      {
        date: { type: Date, required: true },
        isAvailable: { type: Boolean, default: false },
      },
    ],
    blockedSlots: [
      {
        date: { type: Date, required: true },
        startTime: {
          type: String,
          match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/,
        },
        endTime: {
          type: String,
          match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Availability", availabilitySchema);
