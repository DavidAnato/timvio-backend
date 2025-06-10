const mongoose = require("mongoose");

// Modèle Professional
const professionalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true
    },
    phone: {
        type: String,
    },
    salon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Référence vers le salon (User avec role = 'salon')
        required: true
    },
    specialties: [{
        type: String,
        required: true
    }],
    profilePicture: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Statistiques
    ratings: {
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        totalRatings: { type: Number, default: 0 }
    },
    totalAppointments: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Index pour optimiser les recherches
professionalSchema.index({ salon: 1, isActive: 1 });
professionalSchema.index({ specialties: 1 });
professionalSchema.index({ 'ratings.averageRating': -1 });

// Middleware pour créer automatiquement les disponibilités du professionnel
professionalSchema.post('save', async function(doc) {
    try {
        // Vérifier si les disponibilités du professionnel existent déjà
        const existingAvailability = await mongoose.model('ProfessionalAvailability').findOne({ 
            professional: doc._id 
        });
        
        // Si elles n'existent pas, les créer
        if (!existingAvailability) {
            // Récupérer les disponibilités du salon
            const salonAvailability = await mongoose.model('Availability').findOne({ salon: doc.salon });
            
            // Créer les disponibilités du professionnel avec les mêmes données que le salon
            await mongoose.model('ProfessionalAvailability').create({
                professional: doc._id,
                salon: doc.salon,
                inheritFromSalon: true,
                availability: salonAvailability ? salonAvailability.availability : [],
                exceptions: salonAvailability ? salonAvailability.exceptions : [],
                blockedSlots: salonAvailability ? salonAvailability.blockedSlots : []
            });
        }
    } catch (error) {
        console.error('Erreur lors de la création des disponibilités du professionnel:', error);
    }
});

module.exports = mongoose.model("Professional", professionalSchema);