import AuthService from "./auth-service.js";
import ResponseHelper from "../../helpers/response-helper.js";

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const { token } = await AuthService.login(email, password);
      return ResponseHelper.success(res, "Authentication successful", { token });
    } catch (error) {
      return ResponseHelper.error(res, error.message, 401);
    }
  }

  static async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      await AuthService.logout(token, req.user.id);
      return ResponseHelper.success(res, "Logout successful");
    } catch (error) {
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  static async logoutAll(req, res) {
    try {
      await AuthService.logoutAll(req.user.id);
      return ResponseHelper.success(res, "All tokens invalidated. User logged out from all devices.");
    } catch (error) {
      return ResponseHelper.error(res, error.message, 500);
    }
  }

  // 🔹 Fetch authenticated user details
  static async getProfile(req, res) {
    try {
      const user = await AuthService.getProfile(req.user.id);
      return ResponseHelper.success(res, "User details retrieved", user);
    } catch (error) {
      return ResponseHelper.error(res, error.message, 500);
    }
  }
}

export default AuthController;
