require('dotenv').config(); // Assurer que dotenv est chargé

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY n\'est pas définie dans les variables d\'environnement');
}

console.log('Stripe Secret Key loaded:', stripeSecretKey ? 'Oui' : 'Non');

const stripe = require('stripe')(stripeSecretKey);
module.exports = stripe;