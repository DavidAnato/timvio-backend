// routes/payments.js avec documentation Swagger

const express = require('express');
const router = express.Router();
const { createPaymentIntent, confirmPayment } = require('../controllers/paymentController');
const { auth } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentIntent:
 *       type: object
 *       properties:
 *         clientSecret:
 *           type: string
 *           description: Secret client pour Stripe
 *         amount:
 *           type: number
 *           description: Montant en centimes
 *         currency:
 *           type: string
 *           description: Devise du paiement
 *           example: eur
 *     PaymentConfirmation:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         paymentId:
 *           type: string
 *         amount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [succeeded, failed, canceled]
 */

/**
 * @swagger
 * /api/payments/create-payment-intent:
 *   post:
 *     summary: Créer un Payment Intent pour l'acompte d'un rendez-vous
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - paymentType
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID du service pour calculer l'acompte
 *                 example: "60d5ecb74d4f4c001f8b4567"
 *               paymentType:
 *                 type: string
 *                 enum: [deposit, on_site]
 *                 description: Type de paiement (acompte ou sur place)
 *                 example: deposit
 *     responses:
 *       200:
 *         description: Payment Intent créé avec succès ou paiement sur place sélectionné
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaymentIntent'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Paiement sur place sélectionné"
 *                     paymentType:
 *                       type: string
 *                       example: "on_site"
 *       404:
 *         description: Service non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service non trouvé"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.post('/create-payment-intent', auth, createPaymentIntent);

/**
 * @swagger
 * /api/payments/confirm-payment:
 *   post:
 *     summary: Confirmer un paiement après succès
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: ID du Payment Intent Stripe
 *                 example: "pi_1234567890abcdef"
 *     responses:
 *       200:
 *         description: Paiement confirmé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentConfirmation'
 *       400:
 *         description: Le paiement n'a pas abouti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Le paiement n'a pas abouti"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.post('/confirm-payment', auth, confirmPayment);

module.exports = router;