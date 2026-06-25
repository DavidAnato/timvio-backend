const express = require('express');
const router = express.Router();
const { 
  createAppointment, 
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  completePayment
} = require('../controllers/appointmentController');
const { auth } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Créer un nouveau rendez-vous
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - salonId
 *               - serviceId
 *               - professionalId
 *               - date
 *               - startTime
 *               - endTime
 *             properties:
 *               salonId:
 *                 type: string
 *               serviceId:
 *                 type: string
 *               professionalId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 pattern: ^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$
 *               endTime:
 *                 type: string
 *                 pattern: ^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rendez-vous créé avec succès
 *       400:
 *         description: Données invalides ou créneau non disponible
 *       404:
 *         description: Professionnel ou service non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/', auth, createAppointment);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Obtenir les rendez-vous d'un utilisateur
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filtrer par statut
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: boolean
 *         description: Filtrer les rendez-vous à venir
 *     responses:
 *       200:
 *         description: Liste des rendez-vous
 *       500:
 *         description: Erreur serveur
 */
router.get('/', auth, getAppointments);

router.get('/:id', auth, getAppointmentById);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'un rendez-vous
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Rendez-vous non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/status', auth, updateAppointmentStatus);

/**
 * @swagger
 * /api/appointments/{id}/complete-payment:
 *   post:
 *     summary: Compléter le paiement du solde restant d'un rendez-vous
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du rendez-vous
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: ID du Payment Intent Stripe (optionnel pour paiement sur place)
 *           examples:
 *             paiement_stripe:
 *               summary: Paiement via Stripe
 *               value:
 *                 paymentIntentId: "pi_1234567890abcdef"
 *             paiement_sur_place:
 *               summary: Paiement sur place
 *               value: {}
 *     responses:
 *       200:
 *         description: Paiement complété avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Paiement complété avec succès"
 *       400:
 *         description: Le paiement n'a pas abouti
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Rendez-vous non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/complete-payment', auth, completePayment);


module.exports = router; 