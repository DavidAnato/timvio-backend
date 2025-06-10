const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Rendezvous',
      version: '1.0.0',
      description: 'Documentation de l\'API de gestion de rendez-vous',
    },
    servers: [
      {
        url: process.env.HOST || 'https://timvio.zenpilote.fr/',
        description: 'Serveur de développement',
      },
    ],
  },
  apis: ['./routes/*.js'], // chemin vers vos fichiers de routes
};

const specs = swaggerJsdoc(options);
module.exports = specs; 