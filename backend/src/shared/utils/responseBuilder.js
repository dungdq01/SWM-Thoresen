/**
 * Response Builder Utilities
 */

function buildResponse(reply, statusCode, body) {
  return reply.code(statusCode).send({
    success: statusCode >= 200 && statusCode < 300,
    ...body,
  });
}

function buildPagination(page, limit) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  return {
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
  };
}

function buildErrorResponse(reply, error) {
  const statusCode = error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
      details: error.details || {},
    },
  });
}

module.exports = {
  buildResponse,
  buildPagination,
  buildErrorResponse,
};
