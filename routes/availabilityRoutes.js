const express = require("express");
const router = express.Router();
const { 
  // Salon availability
  setSalonAvailability, 
  getSalonAvailability, 
  deleteSalonAvailability,
  addSalonException, 
  blockSalonTimeSlot,
  // Professional availability
  setProfessionalAvailability,
  getProfessionalAvailability,
  deleteProfessionalAvailability,
  addProfessionalException,
  blockProfessionalTimeSlot,
  // Utility functions
  checkAvailability,
  getAvailableSlots
} = require("../controllers/availabilityController");
const { auth, protect, authorize } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     TimeSlot:
 *       type: object
 *       required:
 *         - startTime
 *         - endTime
 *       properties:
 *         startTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$'
 *           example: "09:00"
 *         endTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$'
 *           example: "17:00"
 *     
 *     DayAvailability:
 *       type: object
 *       required:
 *         - dayOfWeek
 *         - isAvailable
 *         - timeSlots
 *       properties:
 *         dayOfWeek:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           description: "0=Dimanche, 1=Lundi, ..., 6=Samedi"
 *         isAvailable:
 *           type: boolean
 *         timeSlots:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TimeSlot'
 *     
 *     Exception:
 *       type: object
 *       required:
 *         - date
 *         - isAvailable
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *         isAvailable:
 *           type: boolean
 *         reason:
 *           type: string
 *     
 *     BlockedSlot:
 *       type: object
 *       required:
 *         - date
 *         - startTime
 *         - endTime
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$'
 *         endTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$'
 *         reason:
 *           type: string
 * 
 * paths:
 *   /api/availability/salon:
 *     post:
 *       summary: Créer ou mettre à jour la disponibilité d'un salon
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
 *                     $ref: '#/components/schemas/DayAvailability'
 *       responses:
 *         200:
 *           description: Disponibilité du salon mise à jour
 *         403:
 *           description: Accès interdit
 *         500:
 *           description: Erreur serveur
 *     
 *     get:
 *       summary: Récupérer la disponibilité du salon connecté
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       responses:
 *         200:
 *           description: Disponibilité du salon récupérée
 *         404:
 *           description: Disponibilité non trouvée
 *         500:
 *           description: Erreur serveur
 *     
 *     delete:
 *       summary: Supprimer complètement la disponibilité du salon
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
 *   /api/availability/salon/{salonId}:
 *     get:
 *       summary: Récupérer la disponibilité d'un salon spécifique (public)
 *       tags: [Disponibilités]
 *       parameters:
 *         - in: path
 *           name: salonId
 *           schema:
 *             type: string
 *           required: true
 *           description: ID du salon
 *       responses:
 *         200:
 *           description: Disponibilité du salon récupérée
 *         404:
 *           description: Salon ou disponibilité non trouvé
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/salon/exception:
 *     post:
 *       summary: Ajouter une exception pour le salon (jour férié, congé)
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exception'
 *       responses:
 *         200:
 *           description: Exception ajoutée
 *         404:
 *           description: Disponibilité non trouvée
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/salon/block:
 *     post:
 *       summary: Bloquer un créneau horaire spécifique pour le salon
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockedSlot'
 *       responses:
 *         200:
 *           description: Créneau bloqué
 *         404:
 *           description: Disponibilité non trouvée
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/professional:
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
 *                 - professionalId
 *               properties:
 *                 professionalId:
 *                   type: string
 *                   description: ID du professionnel
 *                 inheritFromSalon:
 *                   type: boolean
 *                   default: true
 *                   description: Hériter des disponibilités du salon
 *                 availability:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DayAvailability'
 *                   description: Disponibilités personnalisées (si inheritFromSalon = false)
 *       responses:
 *         200:
 *           description: Disponibilité du professionnel mise à jour
 *         403:
 *           description: Accès interdit
 *         500:
 *           description: Erreur serveur
 *     
 *     get:
 *       summary: Récupérer les disponibilités de tous les professionnels du salon
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       responses:
 *         200:
 *           description: Disponibilités des professionnels récupérées
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/professional/{professionalId}:
 *     get:
 *       summary: Récupérer la disponibilité d'un professionnel spécifique
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
 *           description: Disponibilité du professionnel récupérée
 *         404:
 *           description: Professionnel ou disponibilité non trouvé
 *         500:
 *           description: Erreur serveur
 *     
 *     delete:
 *       summary: Supprimer la disponibilité personnalisée d'un professionnel
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: professionalId
 *           schema:
 *             type: string
 *           required: true
 *           description: ID du professionnel
 *       responses:
 *         200:
 *           description: Disponibilité supprimée (retour à l'héritage du salon)
 *         404:
 *           description: Disponibilité non trouvée
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/professional/{professionalId}/exception:
 *     post:
 *       summary: Ajouter une exception pour un professionnel
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: professionalId
 *           schema:
 *             type: string
 *           required: true
 *           description: ID du professionnel
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exception'
 *       responses:
 *         200:
 *           description: Exception ajoutée
 *         404:
 *           description: Professionnel non trouvé
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/professional/{professionalId}/block:
 *     post:
 *       summary: Bloquer un créneau horaire pour un professionnel
 *       tags: [Disponibilités]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: path
 *           name: professionalId
 *           schema:
 *             type: string
 *           required: true
 *           description: ID du professionnel
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockedSlot'
 *       responses:
 *         200:
 *           description: Créneau bloqué
 *         404:
 *           description: Professionnel non trouvé
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/check:
 *     post:
 *       summary: Vérifier la disponibilité d'un professionnel à un moment donné
 *       tags: [Disponibilités]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - professionalId
 *                 - date
 *                 - startTime
 *                 - endTime
 *               properties:
 *                 professionalId:
 *                   type: string
 *                 date:
 *                   type: string
 *                   format: date
 *                 startTime:
 *                   type: string
 *                   pattern: '^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$'
 *                 endTime:
 *                   type: string
 *                   pattern: '^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$'
 *       responses:
 *         200:
 *           description: Statut de disponibilité
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   available:
 *                     type: boolean
 *                   reason:
 *                     type: string
 *         404:
 *           description: Professionnel non trouvé
 *         500:
 *           description: Erreur serveur
 * 
 *   /api/availability/slots:
 *     get:
 *       summary: Récupérer les créneaux disponibles pour un professionnel
 *       tags: [Disponibilités]
 *       parameters:
 *         - in: query
 *           name: professionalId
 *           schema:
 *             type: string
 *           required: true
 *           description: ID du professionnel
 *         - in: query
 *           name: date
 *           schema:
 *             type: string
 *             format: date
 *           required: true
 *           description: Date pour laquelle récupérer les créneaux
 *         - in: query
 *           name: duration
 *           schema:
 *             type: integer
 *             minimum: 15
 *             default: 30
 *           description: Durée du service en minutes
 *       responses:
 *         200:
 *           description: Créneaux disponibles
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   availableSlots:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         startTime:
 *                           type: string
 *                         endTime:
 *                           type: string
 *         404:
 *           description: Professionnel non trouvé
 *         500:
 *           description: Erreur serveur
 */

// Routes pour les disponibilités des salons
router.post("/salon", auth, protect, authorize("salon"), setSalonAvailability);
router.get("/salon", auth, protect, authorize("salon"), getSalonAvailability);
router.delete("/salon", auth, protect, authorize("salon"), deleteSalonAvailability);
router.get("/salon/:salonId", getSalonAvailability);
router.post("/salon/exception", auth, protect, authorize("salon"), addSalonException);
router.post("/salon/block", auth, protect, authorize("salon"), blockSalonTimeSlot);

// Routes pour les disponibilités des professionnels
router.post("/professional", auth, protect, authorize("salon"), setProfessionalAvailability);
router.get("/professional", auth, protect, authorize("salon"), getProfessionalAvailability);
router.get("/professional/:professionalId", getProfessionalAvailability);
router.delete("/professional/:professionalId", auth, protect, authorize("salon"), deleteProfessionalAvailability);
router.post("/professional/:professionalId/exception", auth, protect, authorize("salon"), addProfessionalException);
router.post("/professional/:professionalId/block", auth, protect, authorize("salon"), blockProfessionalTimeSlot);

// Routes utilitaires
router.post("/check", checkAvailability);
router.get("/slots", getAvailableSlots);

module.exports = router;