import helmet from "helmet";

class SecurityMiddleware {
  /**
   * Apply helmet to secure HTTP headers.
   */
  static applyHelmet() {
    return helmet();
  }
}

export default SecurityMiddleware;
