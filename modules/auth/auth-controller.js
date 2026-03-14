import jwt from "jsonwebtoken";
import AuthService from "./auth-service.js";
import BaseResponse from "../../responders/base-responder.js";

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken } = await AuthService.login(req, email, password);

      // Set HTTP-only cookie for browser-based admin access
      const cookieOptions = {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000, // 1 hour
      };
      try {
        res.cookie("accessToken", accessToken, cookieOptions);
      } catch {
        // If cookie setting fails, continue; token is still returned in body
      }

      return BaseResponse.success(res, "Authentication successful", { accessToken, refreshToken });
    } catch (error) {
      return BaseResponse.error(res, error.message, 401);
    }
  }

  static async logout(req, res) {
    try {
      const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
      if (token && req.user?.id) {
        await AuthService.logout(token, req.user.id);
      }
      res.clearCookie("accessToken", { httpOnly: true, sameSite: "lax" });
      return BaseResponse.success(res, "Logout successful");
    } catch (error) {
      res.clearCookie("accessToken", { httpOnly: true, sameSite: "lax" });
      return BaseResponse.error(res, error.message, 500);
    }
  }

  /**
   * GET logout: blacklist token from cookie if present, clear cookie, redirect to admin login.
   * Redirects to the full admin login URL (e.g. https://ucs.moh.go.tz/backend/api/v1/user/admin/login).
   */
  static async logoutAndRedirect(req, res) {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
    try {
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        if (decoded?.id) await AuthService.logout(token, decoded.id);
      }
    } catch {
      // Token missing or invalid; still clear cookie and redirect
    }
    res.clearCookie("accessToken", { httpOnly: true, sameSite: "lax" });
    const base = (process.env.BACKEND_URL || "").replace(/\/+$/, "") + (process.env.SSR_URL_PREFIX || "");
    const loginPath = "/api/v1/user/admin/login";
    const lang = req.query?.lang === "sw" ? "?lang=sw" : "";
    const loginUrl = base ? base + loginPath + lang : req.protocol + "://" + req.get("host") + loginPath + lang;
    return res.redirect(302, loginUrl);
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
