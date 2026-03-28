export const errorHandler = (err, req, res, next) => {
  console.error('Erreur:', err);

  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Erreur interne du serveur',
  });
};
