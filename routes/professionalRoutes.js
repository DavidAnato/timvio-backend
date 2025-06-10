const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/authMiddleware");
const {
  createProfessional,
  getProfessionals,
  getProfessionalById,
  updateProfessional,
  deleteProfessional,
  toggleProfessionalStatus,
  searchProfessionals,
} = require("../controllers/professionalController");

/**
 * @swagger
 * /api/professionals:
 *   post:
 *     summary: Créer un nouveau professionnel
 *     tags:
 *       - Professionnels
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - salonId
 *               - specialties
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jessica Tresse"
 *               email:
 *                 type: string
 *                 example: "jessica@salon.com"
 *               phone:
 *                 type: string
 *                 example: "+33123456789"
 *               salonId:
 *                 type: string
 *                 example: "663a5c1fb6e205b15273fe2c"
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Coiffure", "Coloration"]
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     duration:
 *                       type: number
 *                     price:
 *                       type: number
 *               bio:
 *                 type: string
 *               experience:
 *                 type: number
 *               profilePicture:
 *                 type: string
 *     responses:
 *       201:
 *         description: Professionnel créé avec succès
 *       400:
 *         description: Données manquantes ou invalides
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Salon non trouvé ou invalide
 *       500:
 *         description: Erreur serveur
 */
router.post('/', auth, createProfessional);

/**
 * @swagger
 * /api/professionals/search:
 *   get:
 *     summary: Rechercher des professionnels par critères
 *     tags:
 *       - Professionnels
 *     parameters:
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *         description: Spécialité recherchée
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Ville
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Nom du professionnel
 *       - in: query
 *         name: salonId
 *         schema:
 *           type: string
 *         description: ID du salon
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *         description: Note minimum
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Prix maximum
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: name
 *         description: Critère de tri
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Ordre de tri
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *       500:
 *         description: Erreur serveur
 */
router.get('/search', searchProfessionals);

/**
 * @swagger
 * /api/professionals/salon/{salonId}:
 *   get:
 *     summary: Obtenir la liste des professionnels d'un salon
 *     tags:
 *       - Professionnels
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du salon
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Inclure les professionnels inactifs
 *     responses:
 *       200:
 *         description: Liste des professionnels du salon
 *       404:
 *         description: Salon introuvable ou invalide
 *       500:
 *         description: Erreur serveur
 */
router.get('/salon/:salonId', getProfessionals);

/**
 * @swagger
 * /api/professionals/{id}:
 *   get:
 *     summary: Obtenir un professionnel par ID
 *     tags:
 *       - Professionnels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du professionnel
 *     responses:
 *       200:
 *         description: Détails du professionnel
 *       404:
 *         description: Professionnel introuvable
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', getProfessionalById);

/**
 * @swagger
 * /api/professionals/{id}:
 *   put:
 *     summary: Mettre à jour un professionnel
 *     tags:
 *       - Professionnels
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du professionnel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     duration:
 *                       type: number
 *                     price:
 *                       type: number
 *               bio:
 *                 type: string
 *               experience:
 *                 type: number
 *               profilePicture:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Professionnel mis à jour avec succès
 *       400:
 *         description: Données invalides
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Professionnel introuvable
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', auth, updateProfessional);

/**
 * @swagger
 * /api/professionals/{id}:
 *   delete:
 *     summary: Supprimer un professionnel
 *     tags:
 *       - Professionnels
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du professionnel à supprimer
 *     responses:
 *       200:
 *         description: Professionnel supprimé avec succès
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Professionnel introuvable
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', auth, deleteProfessional);

/**
 * @swagger
 * /api/professionals/{id}/toggle-status:
 *   patch:
 *     summary: Désactiver/Activer un professionnel
 *     tags:
 *       - Professionnels
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du professionnel
 *     responses:
 *       200:
 *         description: Statut du professionnel modifié avec succès
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Professionnel introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/toggle-status', auth, toggleProfessionalStatus);

module.exports = router;