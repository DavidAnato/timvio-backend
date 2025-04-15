const express = require("express");
const router = express.Router();
const { setAvailability, addException, blockTimeSlot, getAvailability, deleteAvailability } = require("../controllers/availabilityController");
const { auth, protect, authorize } = require("../middlewares/authMiddleware"); // Middleware d'authentification

/**
 * @swagger
 * paths:
 *   /api/availability:
 *     post:
 *       summary: Créer ou mettre à jour la disponibilité d'un professionnel
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - availability
 *               properties:
 *                 availability:
 *                   type: array
 *                   items:
 *                     type: object
 *       responses:
 *         200:
 *           description: Disponibilité mise à jour
 *         403:
 *           description: Accès interdit
 *         500:
 *           description: Erreur serveur
 *     delete:
 *       summary: Supprimer complètement une disponibilité
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       responses:
 *         200:
 *           description: Disponibilité supprimée
 *         404:
 *           description: Disponibilité non trouvée
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/exception:
 *     post:
 *       summary: Ajouter une exception (jour férié, congé)
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - date
 *                 - isAvailable
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                 isAvailable:
 *                   type: boolean
 *       responses:
 *         200:
 *           description: Exception ajoutée
 *         404:
 *           description: Disponibilité non trouvée
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/block:
 *     post:
 *       summary: Bloquer un créneau horaire spécifique
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - date
 *                 - startTime
 *                 - endTime
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                 startTime:
 *                   type: string
 *                 endTime:
 *                   type: string
 *       responses:
 *         200:
 *           description: Créneau bloqué
 *         404:
 *           description: Disponibilité non trouvée
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/{professionalId}:
 *     get:
 *       summary: Récupérer la disponibilité d'un professionnel
 *       tags: [Disponibilités]
 *       parameters:
 *         - in: path
 *           name: professionalId
 *           schema:
 *             type: string
 *           required: true
 *           description: ID du professionnel
 *       responses:
 *         200:
 *           description: Disponibilité récupérée
 *         404:
 *           description: Disponibilité non trouvée
 *         500:
 *           description: Erreur serveur
 */
router.post("/", auth, protect, authorize("professional"), setAvailability);
router.post("/exception", protect, authorize("professional"), addException);
router.post("/block", protect, authorize("professional"), blockTimeSlot);
router.get("/:professionalId", getAvailability);
router.delete("/", protect, authorize("professional"), deleteAvailability);

module.exports = router;
