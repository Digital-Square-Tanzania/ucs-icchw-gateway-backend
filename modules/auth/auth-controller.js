import AuthService from "./auth-service.js";
import BaseResponse from "../../responders/base-responder.js";

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken } = await AuthService.login(email, password);

      return BaseResponse.success(res, "Authentication successful", { accessToken, refreshToken });
    } catch (error) {
      return BaseResponse.error(res, error.message, 401);
    }
  }

  static async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      await AuthService.logout(token, req.user.id);
      return BaseResponse.success(res, "Logout successful");
    } catch (error) {
      return BaseResponse.error(res, error.message, 500);
    }
  }

  static async logoutAll(req, res) {
    try {
      await AuthService.logoutAll(req.user.id);
      return BaseResponse.success(res, "All tokens invalidated. User logged out from all devices.");
    } catch (error) {
      return BaseResponse.error(res, error.message, 500);
    }
  }

  // 🔹 Fetch authenticated user details
  static async getProfile(req, res) {
    try {
      const user = await AuthService.getProfile(req.user.id);
      return BaseResponse.success(res, "User details retrieved", user);
    } catch (error) {
      return BaseResponse.error(res, error.message, 500);
    }
  }

  /**
   * Handle Refresh Token and Issue New Access Token
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return BaseResponse.error(res, "Refresh token is required.", 400);
      }

      const { accessToken } = await AuthService.refreshAccessToken(refreshToken);

      return BaseResponse.success(res, "New access token issued.", { accessToken });
    } catch (error) {
      return BaseResponse.error(res, error.message, 401);
    }
  }
}

export default AuthController;
