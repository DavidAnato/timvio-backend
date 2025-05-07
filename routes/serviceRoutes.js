const express = require("express");
const router = express.Router();
const { 
  createService, 
  updateService, 
  getSalonServices, 
  deleteService 
} = require("../controllers/serviceController");
const { auth, protect, authorize } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Créer un nouveau service
 *     tags: [Services]
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
 *               - duration
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: number
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Service créé avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 * 
 * /api/services/{id}:
 *   put:
 *     summary: Mettre à jour un service existant
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: number
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Service mis à jour avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Service non trouvé
 *       500:
 *         description: Erreur serveur
 *   delete:
 *     summary: Supprimer un service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du service
 *     responses:
 *       200:
 *         description: Service supprimé avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Service non trouvé
 *       500:
 *         description: Erreur serveur
 * 
 * /api/services/salon/{salonId}:
 *   get:
 *     summary: Récupérer tous les services d'un salon
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: salonId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du salon
 *     responses:
 *       200:
 *         description: Liste des services récupérée avec succès
 *       404:
 *         description: Salon non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post("/", auth, protect, authorize("salon"), createService);

router.put("/:id", auth, protect, authorize("salon"), updateService);
router.get("/salon/:salonId", getSalonServices);
router.delete("/:id", auth, protect, authorize("salon"), deleteService);

module.exports = router; 