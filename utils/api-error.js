/**
 * @file api-error.js
 * @description API Error class to standardize api-error handling.
 */

class ApiError extends Error {
  /**
   * @param {string} message - Error message.
   * @param {number} statusCode - HTTP status code (default is 500).
   * @param {number} customCode - Custom error code (default is 0).
   */
  constructor(message, statusCode = 500, customCode = 0) {
    super(message); // <-- only pass message here
    this.statusCode = statusCode;
    this.customCode = customCode; // <-- this was missing
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
