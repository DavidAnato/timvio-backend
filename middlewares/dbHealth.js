const { isDbConnected } = require('../config/database');

const requireDatabase = (req, res, next) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      message: 'Base de données indisponible. Réessayez dans quelques instants.',
    });
  }
  next();
};

module.exports = { requireDatabase };
