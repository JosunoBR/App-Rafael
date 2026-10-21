const config = require('../config/environment');

function errorHandler(err, req, res, next) {
  console.error('[ERRO INTERNO]:', err.stack || err.message || err);

  const statusCode = err.status || err.statusCode || 500;

  // Mensagem limpa sem expor stack traces em produção
  const response = {
    error: err.message || 'Ocorreu um erro interno no processamento da solicitação.',
    timestamp: new Date().toISOString()
  };

  if (err.code) response.code = err.code;
  if (err.suggestedNextNumber) response.suggestedNextNumber = err.suggestedNextNumber;
  if (err.conflictDetails) response.conflictDetails = err.conflictDetails;
  if (err.suggestedNextCode) response.suggestedNextCode = err.suggestedNextCode;
  if (err.conflictProduct) response.conflictProduct = err.conflictProduct;
  if (err.lastModifier) response.lastModifier = err.lastModifier;
  if (err.lastModifiedAt) response.lastModifiedAt = err.lastModifiedAt;
  if (err.currentVersion !== undefined) response.currentVersion = err.currentVersion;
  if (err.incomingVersion !== undefined) response.incomingVersion = err.incomingVersion;

  if (config.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  errorHandler
};
