const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "Token d'authentification manquant" });
    }

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedToken;
      next();
    } catch (jwtError) {
      return res.status(401).json({ message: "Token invalide" });
    }
  } catch (error) {
    res.status(401).json({ message: "Token invalide" });
  }
};

// ... existing code ...

const authorize = (role) => {
  return (req, res, next) => {
    if (!req.user.role || req.user.role !== role) {
      return res.status(403).json({ 
        message: "Vous n'avez pas les permissions nécessaires" 
      });
    }
    next();
  };
};

const protect = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Veuillez vous connecter pour accéder à cette ressource" });
  }
  next();
};

module.exports = { auth, authorize, protect };