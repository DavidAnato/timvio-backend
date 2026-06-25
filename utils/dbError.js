const isDbError = (error) => {
  if (!error) return false;
  const name = error.name || '';
  const message = error.message || '';
  return (
    name === 'MongoServerSelectionError' ||
    name === 'MongoNetworkError' ||
    name === 'MongooseError' ||
    message.includes('buffering timed out') ||
    message.includes('ECONNREFUSED') ||
    message.includes('querySrv')
  );
};

const dbUnavailableResponse = (res) =>
  res.status(503).json({ message: 'Base de données indisponible. Réessayez dans quelques instants.' });

module.exports = { isDbError, dbUnavailableResponse };
