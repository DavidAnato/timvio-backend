const express = require('express');
const router = express.Router();
const {
  createNotification,
  saveNotificationToken,
  getUserNotifications,
  markNotificationAsRead,
} = require('../controllers/notificationController');
const { auth } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestion des notifications
 */

/**
 * @swagger
 * /notifications/create:
 *   post:
 *     summary: Créer une notification et envoyer un push Expo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - message
 *             properties:
 *               recipientId:
 *                 type: string
 *                 example: 6650a9fb3a4f7a1ecf2b1234
 *               message:
 *                 type: string
 *                 example: "Vous avez un nouveau message"
 *               title:
 *                 type: string
 *                 example: "Nouveau message"
 *               object:
 *                 type: object
 *                 example: { type: "message", id: "123" }
 *     responses:
 *       201:
 *         description: Notification créée avec succès
 *       500:
 *         description: Erreur serveur
 */
router.post('/create', auth, createNotification);

/**
 * @swagger
 * /notifications/token:
 *   post:
 *     summary: Enregistrer un token Expo pour un utilisateur
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 6650a9fb3a4f7a1ecf2b1234
 *               token:
 *                 type: string
 *                 example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 *     responses:
 *       200:
 *         description: Token enregistré avec succès
 *       500:
 *         description: Erreur serveur
 */
router.post('/token', auth, saveNotificationToken);

/**
 * @swagger
 * /notifications/user/{userId}:
 *   get:
 *     summary: Obtenir toutes les notifications d’un utilisateur
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Liste des notifications
 *       500:
 *         description: Erreur serveur
 */
router.get('/user/:userId', auth, getUserNotifications);

/**
 * @swagger
 * /notifications/read/{notificationId}:
 *   patch:
 *     summary: Marquer une notification comme lue
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la notification
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 *       404:
 *         description: Notification introuvable
 *       500:
 *         description: Erreur serveur
 */
router.patch('/read/:notificationId', auth, markNotificationAsRead);

module.exports = router;
