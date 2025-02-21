/**
 * @file custon-error.js
 * @description Custom Error class to standardize error handling.
 */

class CustomError extends Error {
  /**
   * @param {string} message - Error message.
   * @param {number} statusCode - HTTP status code (default is 500).
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default CustomError;
