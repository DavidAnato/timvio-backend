const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/authMiddleware");
const {
  createProfessional,
  getProfessionals,
  updateProfessional,
  deleteProfessional,
} = require("../controllers/professionalController");

/**
 * @swagger
 * /api/professionals/create:
 *   post:
 *     summary: Créer un professionnel et l'associer à un salon
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
 *               - salonId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jessica Tresse"
 *               salonId:
 *                 type: string
 *                 example: "663a5c1fb6e205b15273fe2c"
 *     responses:
 *       201:
 *         description: Professionnel créé avec succès
 *       400:
 *         description: Données manquantes
 *       404:
 *         description: Salon non trouvé ou invalide
 *       500:
 *         description: Erreur serveur
 */
router.post('/create', auth, createProfessional);

/**
 * @swagger
 * /api/professionals/{salonId}:
 *   get:
 *     summary: Obtenir tous les professionnels associés à un salon
 *     tags:
 *       - Professionnels
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: salonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du salon
 *     responses:
 *       200:
 *         description: Liste des professionnels
 *       404:
 *         description: Salon introuvable ou invalide
 *       500:
 *         description: Erreur serveur
 */
router.get('/:salonId', auth, getProfessionals);

/**
 * @swagger
 * /api/professionals/update/{id}:
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
 *                 example: "Jessica Nouveau"
 *     responses:
 *       200:
 *         description: Professionnel mis à jour
 *       404:
 *         description: Professionnel introuvable
 *       500:
 *         description: Erreur serveur
 */
router.put('/update/:id', auth, updateProfessional);

/**
 * @swagger
 * /api/professionals/delete/{id}:
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
 *         description: Professionnel supprimé
 *       404:
 *         description: Professionnel introuvable
 *       500:
 *         description: Erreur serveur
 */
router.delete('/delete/:id', auth, deleteProfessional);

module.exports = router;
