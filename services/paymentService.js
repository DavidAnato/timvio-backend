const stripe = require('../utils/stripe');

class PaymentService {
  /**
   * Créer un PaymentIntent pour un acompte
   * @param {Object} options - Options de paiement
   * @param {number} options.amount - Montant en centimes
   * @param {string} options.currency - Devise (ex: 'eur')
   * @param {string} options.customerId - ID client Stripe
   * @param {Object} options.metadata - Métadonnées additionnelles
   * @returns {Object} PaymentIntent
   */
  async createPaymentIntent({
    amount,
    currency = 'eur',
    customerId,
    metadata = {}
  }) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convertir en centimes
        currency,
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Erreur lors de la création du PaymentIntent:', error);
      throw new Error('Erreur lors de la création du paiement');
    }
  }

  /**
   * Créer un client Stripe
   * @param {Object} customerData - Données du client
   * @returns {Object} Customer Stripe
   */
  async createCustomer(customerData) {
    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: `${customerData.firstName} ${customerData.lastName}`,
        phone: customerData.phone,
        metadata: {
          userId: customerData.userId
        }
      });

      return customer;
    } catch (error) {
      console.error('Erreur lors de la création du client Stripe:', error);
      throw new Error('Erreur lors de la création du client');
    }
  }

  /**
   * Confirmer un paiement
   * @param {string} paymentIntentId - ID du PaymentIntent
   * @returns {Object} PaymentIntent confirmé
   */
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Erreur lors de la confirmation du paiement:', error);
      throw new Error('Erreur lors de la confirmation du paiement');
    }
  }

  /**
   * Créer un remboursement
   * @param {string} paymentIntentId - ID du PaymentIntent
   * @param {number} amount - Montant à rembourser (optionnel)
   * @returns {Object} Refund
   */
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundData = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      throw new Error('Erreur lors du remboursement');
    }
  }

  /**
   * Calculer l'acompte (par défaut 30% du prix du service)
   * @param {number} servicePrice - Prix du service
   * @param {number} depositPercentage - Pourcentage d'acompte (défaut: 30)
   * @returns {number} Montant de l'acompte
   */
  calculateDeposit(servicePrice, depositPercentage = 30) {
    return Math.round((servicePrice * depositPercentage) / 100 * 100) / 100; // Arrondir à 2 décimales
  }
}

module.exports = new PaymentService();
