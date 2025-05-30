const express = require('express');
const router = express.Router();
const {
  createReview,
  getSalonReviews,
  getClientReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getSalonReviewStats,
  getAllReviews
} = require('../controllers/reviewController');
const { auth, protect, authorize } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - client
 *         - salon
 *         - rating
 *       properties:
 *         _id:
 *           type: string
 *           description: ID unique de la review
 *         client:
 *           type: string
 *           description: ID du client
 *         salon:
 *           type: string
 *           description: ID du salon
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Note de 1 à 5 étoiles
 *         comment:
 *           type: string
 *           maxLength: 500
 *           description: Commentaire optionnel
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Créer une nouvelle review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - salon
 *               - rating
 *             properties:
 *               salon:
 *                 type: string
 *                 description: ID du salon à reviewer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Note de 1 à 5
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *                 description: Commentaire optionnel
 *     responses:
 *       201:
 *         description: Review créée avec succès
 *       400:
 *         description: Données invalides ou review déjà existante
 *       404:
 *         description: Salon non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/', auth, createReview);

/**
 * @swagger
 * /api/reviews/my-reviews:
 *   get:
 *     summary: Récupérer ses propres reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des reviews du client
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *       500:
 *         description: Erreur serveur
 */
router.get('/my-reviews', auth, getClientReviews);

/**
 * @swagger
 * /api/reviews/salon/{salonId}:
 *   get:
 *     summary: Récupérer les reviews d'un salon
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: salonId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du salon
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
 *         description: Nombre de reviews par page
 *     responses:
 *       200:
 *         description: Reviews récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalReviews:
 *                       type: integer
 *                 averageRating:
 *                   type: number
 *       500:
 *         description: Erreur serveur
 */
router.get('/salon/:salonId', getSalonReviews);

/**
 * @swagger
 * /api/reviews/salon/{salonId}/stats:
 *   get:
 *     summary: Récupérer les statistiques des reviews d'un salon
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: salonId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du salon
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReviews:
 *                   type: integer
 *                 averageRating:
 *                   type: number
 *                 ratingDistribution:
 *                   type: object
 *                   properties:
 *                     "5":
 *                       type: integer
 *                     "4":
 *                       type: integer
 *                     "3":
 *                       type: integer
 *                     "2":
 *                       type: integer
 *                     "1":
 *                       type: integer
 *       500:
 *         description: Erreur serveur
 */
router.get('/salon/:salonId/stats', getSalonReviewStats);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   get:
 *     summary: Récupérer une review spécifique
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la review
 *     responses:
 *       200:
 *         description: Review récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review non trouvée
 *       500:
 *         description: Erreur serveur
 *   patch:
 *     summary: Modifier sa propre review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la review
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Review mise à jour avec succès
 *       400:
 *         description: Données invalides
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Review non trouvée
 *       500:
 *         description: Erreur serveur
 *   delete:
 *     summary: Supprimer sa propre review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la review
 *     responses:
 *       200:
 *         description: Review supprimée avec succès
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Review non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/:reviewId', getReviewById);
router.patch('/:reviewId', protect, authorize('client'), updateReview);
router.delete('/:reviewId', protect, authorize('client'), deleteReview);

/**
 * @swagger
 * /api/reviews/admin/all:
 *   get:
 *     summary: Récupérer toutes les reviews (admin uniquement)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 20
 *         description: Nombre de reviews par page
 *     responses:
 *       200:
 *         description: Reviews récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalReviews:
 *                       type: integer
 *       403:
 *         description: Accès interdit
 *       500:
 *         description: Erreur serveur
 */
router.get('/admin/all', protect, authorize('admin'), getAllReviews);

/**
 * @swagger
 * /api/reviews/admin/{reviewId}:
 *   delete:
 *     summary: Supprimer n'importe quelle review (admin uniquement)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la review
 *     responses:
 *       200:
 *         description: Review supprimée avec succès
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Review non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/admin/:reviewId', protect, authorize('admin'), async (req, res) => {
  try {
    const { reviewId } = req.params;
    const Review = require('../models/Review');
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review non trouvée" });
    }

    await Review.findByIdAndDelete(reviewId);
    res.json({ message: "Review supprimée avec succès par l'administrateur" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;