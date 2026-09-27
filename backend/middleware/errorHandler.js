export const errorHandler = (error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Request body must contain valid JSON.'
    });
  }

  if (error?.message === 'Origin is not allowed by CORS.' || error?.message?.includes?.('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed by CORS.'
    });
  }

  console.error('[ShelterX Error]:', error);
  return res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error.'
  });
};

export const notFoundHandler = (_req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found.'
  });
};
