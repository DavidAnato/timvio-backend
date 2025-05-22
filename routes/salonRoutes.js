const express = require('express');
const router = express.Router();
const { searchSalons } = require('../controllers/salonSearchController');
const { getSalonProfile } = require('../controllers/getSalonProfileController');
/**
 * @swagger
 * /api/salons/search:
 *   get:
 *     summary: Rechercher des salons
 *     tags: [Salons]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche globale (nom, prénom, nom du salon)
 *       - in: query
 *         name: salonName
 *         schema:
 *           type: string
 *         description: Nom spécifique du salon
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Ville du professionnel
 *       - in: query
 *         name: speciality
 *         schema:
 *           type: string
 *         description: Spécialité du professionnel
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: "Trier par (ex: ratings:desc)"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre de résultats par page
 *     responses:
 *       200:
 *         description: Liste des professionnels correspondant aux critères
 *       500:
 *         description: Erreur serveur
 */
// Route publique pour la recherche des professionnels
router.get('/search', searchSalons);

/**
 * @swagger
 * /api/salons/{id}:
 *   get:
 *     summary: Récupérer le profil d'un salon
 *     tags: [Salons]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du salon
 *     responses:
 *       200:
 *         description: Profil du salon récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "662ed8bd4a3656cb8fe397e2"
 *                 firstName:
 *                   type: string
 *                   example: "David"
 *                 lastName:
 *                   type: string
 *                   example: "ANATO"
 *                 email:
 *                   type: string
 *                   example: "david@example.com"
 *                 phone:
 *                   type: string
 *                   example: "+22961000000"
 *                 role:
 *                   type: string
 *                   example: "salon"
 *                 profilePicture:
 *                   type: string
 *                   example: "https://cdn.example.com/uploads/avatar.jpg"
 *                 bio:
 *                   type: string
 *                   example: "Coiffeur expérimenté depuis 10 ans."
 *                 profession:
 *                   type: string
 *                   example: "Coiffeur"
 *                 speciality:
 *                   type: string
 *                   example: "Tresses africaines"
 *                 salon:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Salon Prestige"
 *                     description:
 *                       type: string
 *                       example: "Un salon haut de gamme pour tous types de coiffures."
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["https://cdn.example.com/salon1.jpg"]
 *                 address:
 *                   type: object
 *                   properties:
 *                     street:
 *                       type: string
 *                       example: "Rue des Coiffeurs"
 *                     city:
 *                       type: string
 *                       example: "Cotonou"
 *                     postalCode:
 *                       type: string
 *                       example: "229"
 *                     country:
 *                       type: string
 *                       example: "Bénin"
 *                 ratings:
 *                   type: object
 *                   properties:
 *                     averageRating:
 *                       type: number
 *                       example: 4.7
 *                     totalReviews:
 *                       type: number
 *                       example: 15
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "662fa032c51f3bb7b51f9571"
 *                       name:
 *                         type: string
 *                         example: "Tresse simple"
 *                       description:
 *                         type: string
 *                         example: "Tresse classique avec soins inclus."
 *                       duration:
 *                         type: number
 *                         example: 45
 *                       price:
 *                         type: number
 *                         example: 5000
 *                       category:
 *                         type: string
 *                         enum:
 *                           - homme
 *                           - femme
 *                           - enfant
 *                         example: "homme"
 *       404:
 *         description: Salon non trouvé
 *       500:
 *         description: Erreur serveur
 */

router.get("/:id", getSalonProfile);

module.exports = router; 