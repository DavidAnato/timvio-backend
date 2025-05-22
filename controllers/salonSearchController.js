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
            limit = 10,
            latitude,
            longitude,
            radius = 10000
        } = req.query;

        if (!city && (!latitude || !longitude)) {
            return res.status(400).json({ 
                message: "Soit la ville, soit les coordonnées GPS (latitude et longitude) doivent être fournies" 
            });
        }

        const filter = { 
            role: 'salon',
            isVerified: true
        };

        // Recherche textuelle
        if (query) {
            filter.$or = [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { 'salon.name': { $regex: query, $options: 'i' } },
                { speciality: { $regex: query, $options: 'i' } },
                { bio: { $regex: query, $options: 'i' } }
            ];
        }

        if (speciality) {
            filter.speciality = speciality;
        }

        if (salonName) {
            filter['salon.name'] = { $regex: salonName, $options: 'i' };
        }

        let users;
        let total;
        const skip = (page - 1) * limit;

        // Recherche par ville OU par proximité
        if (city) {
            filter['address.city'] = { $regex: city, $options: 'i' };
            
            // Tri normal pour la recherche par ville
            const sort = {};
            if (sortBy) {
                const [field, order] = sortBy.split(':');
                sort[field] = order === 'desc' ? -1 : 1;
            } else {
                sort['ratings.averageRating'] = -1;
            }

            users = await User.find(filter)
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
                    'location',
                    'ratings',
                    'bio'
                ]);

            total = await User.countDocuments(filter);

        } else if (latitude && longitude) {
            // Recherche par proximité
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            const radiusInMeters = parseInt(radius);

            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return res.status(400).json({ 
                    message: "Coordonnées GPS invalides" 
                });
            }

            try {
                // Tentative avec $geoNear d'abord
                const pipeline = [
                    {
                        $geoNear: {
                            near: {
                                type: "Point",
                                coordinates: [lng, lat]
                            },
                            distanceField: "calculatedDistance",
                            maxDistance: radiusInMeters,
                            query: filter,
                            spherical: true,
                            key: "location.coordinates"
                        }
                    },
                    {
                        $project: {
                            firstName: 1,
                            lastName: 1,
                            profilePicture: 1,
                            speciality: 1,
                            salon: 1,
                            address: 1,
                            location: 1,
                            ratings: 1,
                            bio: 1,
                            calculatedDistance: 1
                        }
                    }
                ];

                // Ajout du tri si spécifié (après $geoNear)
                if (sortBy && sortBy !== 'distance:asc') {
                    const [field, order] = sortBy.split(':');
                    const sortStage = {};
                    sortStage[field] = order === 'desc' ? -1 : 1;
                    pipeline.push({ $sort: sortStage });
                }

                // Ajout de la pagination
                pipeline.push({ $skip: skip });
                pipeline.push({ $limit: parseInt(limit) });

                const aggregationResult = await User.aggregate(pipeline);
                users = aggregationResult;

                // Compter le total pour la proximité
                const countPipeline = [
                    {
                        $geoNear: {
                            near: {
                                type: "Point",
                                coordinates: [lng, lat]
                            },
                            distanceField: "calculatedDistance",
                            maxDistance: radiusInMeters,
                            query: filter,
                            spherical: true,
                            key: "location.coordinates"
                        }
                    },
                    {
                        $count: "total"
                    }
                ];

                const countResult = await User.aggregate(countPipeline);
                total = countResult.length > 0 ? countResult[0].total : 0;

            } catch (geoNearError) {
                console.log('$geoNear failed, falling back to $geoWithin:', geoNearError.message);
                
                // Fallback avec $geoWithin si $geoNear échoue
                filter['location.coordinates'] = {
                    $geoWithin: {
                        $centerSphere: [
                            [lng, lat], 
                            radiusInMeters / 6378100 // Conversion radius en radians
                        ]
                    }
                };

                // Tri normal (pas de contrainte géospatiale)
                const sort = {};
                if (sortBy && sortBy !== 'distance:asc') {
                    const [field, order] = sortBy.split(':');
                    sort[field] = order === 'desc' ? -1 : 1;
                } else {
                    sort['ratings.averageRating'] = -1;
                }

                users = await User.find(filter)
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
                        'location',
                        'ratings',
                        'bio'
                    ]);

                total = await User.countDocuments(filter);
            }
        }

        // Traitement des disponibilités et calcul de distance
        const salonsWithAvailability = await Promise.all(users.map(async (salon) => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            
            const availability = await Availability.findOne({
                salon: salon._id
            });

            let distance = null;
            
            // Si on a une distance calculée par $geoNear, on l'utilise
            if (salon.calculatedDistance !== undefined) {
                distance = Math.round(salon.calculatedDistance / 1000 * 100) / 100; // Conversion en km
            }
            // Sinon, calcul manuel de distance avec la nouvelle structure
            else if (latitude && longitude && salon.location && salon.location.coordinates) {
                const [salonLng, salonLat] = salon.location.coordinates;
                const userLat = parseFloat(latitude);
                const userLng = parseFloat(longitude);
                
                distance = calculateDistance(userLat, userLng, salonLat, salonLng);
            }
            // Fallback pour l'ancienne structure
            else if (latitude && longitude && salon.location && salon.location.latitude && salon.location.longitude) {
                const salonLat = parseFloat(salon.location.latitude);
                const salonLng = parseFloat(salon.location.longitude);
                const userLat = parseFloat(latitude);
                const userLng = parseFloat(longitude);
                
                distance = calculateDistance(userLat, userLng, salonLat, salonLng);
            }

            // Gestion de salon comme objet Mongoose ou objet plain
            const salonObj = salon.toObject ? salon.toObject() : salon;

            if (!availability) {
                return {
                    ...salonObj,
                    nextAvailability: null,
                    distance: distance
                };
            }

            const nextRecurringSlot = availability.availability.find(slot => 
                slot.dayOfWeek === dayOfWeek && 
                slot.isAvailable
            );

            const todayException = availability.exceptions.find(exception => 
                exception.date.toDateString() === now.toDateString()
            );

            if (todayException && !todayException.isAvailable) {
                return {
                    ...salonObj,
                    nextAvailability: null,
                    distance: distance
                };
            }

            if (nextRecurringSlot) {
                return {
                    ...salonObj,
                    nextAvailability: {
                        startTime: nextRecurringSlot.startTime,
                        endTime: nextRecurringSlot.endTime,
                        isToday: true
                    },
                    distance: distance
                };
            }

            const nextAvailableDay = availability.availability
                .filter(slot => slot.isAvailable)
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .find(slot => slot.dayOfWeek > dayOfWeek);

            if (nextAvailableDay) {
                return {
                    ...salonObj,
                    nextAvailability: {
                        startTime: nextAvailableDay.startTime,
                        endTime: nextAvailableDay.endTime,
                        isToday: false,
                        nextAvailableDay: nextAvailableDay.dayOfWeek
                    },
                    distance: distance
                };
            }

            return {
                ...salonObj,
                nextAvailability: null,
                distance: distance
            };
        }));

        // Tri par distance si demandé et si on n'a pas pu utiliser $geoNear
        if (sortBy === 'distance:asc' && latitude && longitude && !users[0]?.calculatedDistance) {
            salonsWithAvailability.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        } else if (sortBy === 'distance:desc' && latitude && longitude && !users[0]?.calculatedDistance) {
            salonsWithAvailability.sort((a, b) => (b.distance || 0) - (a.distance || 0));
        }

        res.status(200).json({
            salons: salonsWithAvailability,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalResults: total,
            searchType: city ? 'city' : 'proximity',
            searchLocation: city || { latitude, longitude, radius }
        });

    } catch (error) {
        console.error('Erreur lors de la recherche des salons:', error);
        res.status(500).json({ 
            message: "Erreur lors de la recherche des salons", 
            error: error.message 
        });
    }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 100) / 100;
}

module.exports = {
    searchSalons
};