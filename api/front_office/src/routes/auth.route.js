import express from "express";
import { register, login, me, logout, changePassword } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", me);
router.post("/logout", logout);
// Route protégée: changement de mot de passe
router.post('/change-password', verifyToken, changePassword);

export default router;
