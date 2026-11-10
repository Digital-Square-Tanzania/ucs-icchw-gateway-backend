import CustomError from "./custom-error.js";
import AuthRepository from "../modules/auth/auth-repository.js";

/**
 * Council scope for manager UI (activations, analytics).
 * Coordinators are locked to assignment; admins use query/body filters.
 */
export async function resolveCouncilScopeForRequest(req) {
  const mgr = req.managerUser;
  if (mgr?.roleName === "COUNCIL_COORDINATOR") {
    if (!mgr.assignedCouncil) {
      throw new CustomError("Council coordinator has no assigned council.", 403);
    }
    return {
      region: mgr.assignedRegion || "",
      district: mgr.assignedDistrict || "",
      council: mgr.assignedCouncil,
    };
  }

  if (req.user?.role === "COUNCIL_COORDINATOR") {
    const user = await AuthRepository.findUserById(req.user.id);
    if (!user?.assignedCouncil) {
      throw new CustomError("Council coordinator has no assigned council.", 403);
    }
    return {
      region: user.assignedRegion || "",
      district: user.assignedDistrict || "",
      council: user.assignedCouncil,
    };
  }

  const q = req.query || {};
  const body = req.body || {};
  const lf = body.locationFilter || {};
  return {
    region: lf.region || q.region || body.region || "",
    district: lf.district || q.district || body.district || "",
    council: lf.council || q.council || body.council || "",
  };
}
