// controllers/paymentController.js
const stripe = require('../utils/stripe');
const Service = require('../models/Service');

/**
 * @desc Créer un Payment Intent pour l'acompte
 * @route POST /api/payments/create-payment-intent
 * @access Private
 */
const createPaymentIntent = async (req, res) => {
  try {
    const { serviceId, paymentType } = req.body;
    
    if (paymentType === 'on_site') {
      return res.status(200).json({ 
        message: "Paiement sur place sélectionné",
        paymentType: 'on_site'
      });
    }

    // Récupérer le service pour calculer l'acompte
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service non trouvé" });
    }

    // Calculer l'acompte (30% du prix du service)
    const depositAmount = Math.round(service.price * 0.30 * 100); // Stripe utilise les centimes

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: depositAmount,
      currency: 'eur',
      metadata: {
        serviceId: serviceId,
        userId: req.user.userId,
        type: 'deposit'
      }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: depositAmount,
      currency: 'eur'
    });

  } catch (error) {
    console.error('Erreur lors de la création du Payment Intent:', error);
    res.status(500).json({ 
      message: "Erreur lors de la création du paiement", 
      error: error.message 
    });
  }
};

/**
 * @desc Confirmer le paiement après succès
 * @route POST /api/payments/confirm-payment
 * @access Private
 */
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Récupérer les détails du paiement depuis Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: "Le paiement n'a pas abouti" });
    }

    res.status(200).json({
      message: "Paiement confirmé avec succès",
      paymentId: paymentIntentId,
      amount: paymentIntent.amount,
      status: paymentIntent.status
    });

  } catch (error) {
    console.error('Erreur lors de la confirmation du paiement:', error);
    res.status(500).json({ 
      message: "Erreur lors de la confirmation du paiement", 
      error: error.message 
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment
};