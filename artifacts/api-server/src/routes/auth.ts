import { Router } from "express";
import { getAuth } from "@clerk/express";
import { getStaffRole } from "./store.js";

const router = Router();

router.get("/auth/me", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.json({ authenticated: false, role: null });
    return;
  }
  const role = await getStaffRole(auth.userId, auth.sessionClaims);
  res.json({ authenticated: true, role });
});

export default router;
