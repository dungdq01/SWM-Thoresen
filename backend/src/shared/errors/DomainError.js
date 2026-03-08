/**
 * Base Domain Error
 */

class DomainError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
    this.statusCode = this.getStatusCodeFromCode(code);
    Error.captureStackTrace(this, this.constructor);
  }

  getStatusCodeFromCode(code) {
    if (!code) return 500;
    const prefix = code.split('-')[1];
    if (prefix) {
      const statusCode = parseInt(prefix, 10);
      if (!isNaN(statusCode) && statusCode >= 100 && statusCode < 600) {
        return statusCode;
      }
    }
    return 500;
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

module.exports = { DomainError };
