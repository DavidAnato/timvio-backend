const User = require('../models/User');
const Availability = require('../models/Availability');

const searchSalons = async (req, res) => {
    try {
        const {
            query,
            speciality,
            city,
            salonName,
            sortBy,
            page = 1,
            limit = 10
        } = req.query;

        // Filtre de base : uniquement les professionnels vérifiés
        const filter = { 
            role: 'salon',
            isVerified: true
        }; 

        if (query) {
            filter.$or = [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { 'salon.name': { $regex: query, $options: 'i' } }
            ];
        }

        if (speciality) {
            filter.speciality = speciality;
        }

        if (city) {
            filter['address.city'] = { $regex: city, $options: 'i' };
        }

        if (salonName) {
            filter['salon.name'] = { $regex: salonName, $options: 'i' };
        }

        const sort = {};
        if (sortBy) {
            const [field, order] = sortBy.split(':');
            sort[field] = order === 'desc' ? -1 : 1;
        } else {
            sort.ratings = -1;
        }

        const skip = (page - 1) * limit;

        const users = await User.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .select([
                'firstName',
                'lastName',
                'profilePicture',
                'speciality',
                'salon',
                'address',
                'ratings',
                'bio'
            ]);

        // Récupérer les disponibilités pour chaque professionnel
        const salonsWithAvailability = await Promise.all(users.map(async (salon) => {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = Dimanche, 6 = Samedi
            
            // Trouver les disponibilités du professionnel
            const availability = await Availability.findOne({
                salon: salon._id
            });

            if (!availability) {
                return {
                    ...salon.toObject(),
                    nextAvailability: null
                };
            }

            // Trouver la prochaine disponibilité dans les horaires récurrents
            const nextRecurringSlot = availability.availability.find(slot => 
                slot.dayOfWeek === dayOfWeek && 
                slot.isAvailable
            );

            // Vérifier les exceptions pour aujourd'hui
            const todayException = availability.exceptions.find(exception => 
                exception.date.toDateString() === now.toDateString()
            );

            // Si une exception existe pour aujourd'hui et qu'elle n'est pas disponible
            if (todayException && !todayException.isAvailable) {
                return {
                    ...salon.toObject(),
                    nextAvailability: null
                };
            }

            // Si une disponibilité est trouvée pour aujourd'hui
            if (nextRecurringSlot) {
                return {
                    ...salon.toObject(),
                    nextAvailability: {
                        startTime: nextRecurringSlot.startTime,
                        endTime: nextRecurringSlot.endTime,
                        isToday: true
                    }
                };
            }

            // Si aucune disponibilité aujourd'hui, chercher le prochain jour disponible
            const nextAvailableDay = availability.availability
                .filter(slot => slot.isAvailable)
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .find(slot => slot.dayOfWeek > dayOfWeek);

            if (nextAvailableDay) {
                return {
                    ...salon.toObject(),
                    nextAvailability: {
                        startTime: nextAvailableDay.startTime,
                        endTime: nextAvailableDay.endTime,
                        isToday: false,
                        nextAvailableDay: nextAvailableDay.dayOfWeek
                    }
                };
            }

            return {
                ...salon.toObject(),
                nextAvailability: null
            };
        }));

        const total = await User.countDocuments(filter);

        res.status(200).json({
            salons: salonsWithAvailability,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalResults: total
        });

    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la recherche des professionnels", error: error.message });
    }
};

module.exports = {
    searchSalons
}; 