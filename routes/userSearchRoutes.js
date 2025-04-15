const express = require('express');
const router = express.Router();
const { searchUsers } = require('../controllers/professionalSearchController');

/**
 * @swagger
 * /api/professionals/search:
 *   get:
 *     summary: Rechercher des professionnels
 *     tags: [Professionnels]
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
router.get('/search', searchUsers);

module.exports = router; 