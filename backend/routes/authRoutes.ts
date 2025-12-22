import { Router } from "express";
import { body } from "express-validator";
import { register, login, getProfile } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimiter";
import passport from "passport";
import config from "../config";
const router = Router();

router.post(
  "/register",
  // authRateLimiter,
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("name").notEmpty().withMessage("Name is required"),
  ],
  register
);

router.post(
  "/login",
  // authRateLimiter,
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

router.get("/profile", authenticate, getProfile);

//google oauth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const { token } = req.user as any;

    res.redirect(`${config.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

export default router;
