import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { listAdmins, addAdmin, updateAdminStatus, deleteAdmin, updateAdmin } from "../controllers/admin.controller.js";
import { listAllCommentsForAdmin } from "../controllers/adminComment.controller.js";

const router = express.Router();

// Récupérer la liste des administrateurs
router.get("/", listAdmins);

// Liste des commentaires (admin)
router.get('/comments', verifyToken, checkRole(['super_admin','admin_contenu']), listAllCommentsForAdmin);

// Ajouter un administrateur
router.post("/", verifyToken, checkRole(["super_admin"]), addAdmin);

// Activer / Désactiver un administrateur
router.put("/:id/status", verifyToken, checkRole(["super_admin"]), updateAdminStatus);

// Supprimer un administrateur
router.delete("/:id", verifyToken, checkRole(["super_admin"]), deleteAdmin);

// Mettre à jour un administrateur (nom, prénom, email, rôle, et optionnellement mot de passe)
router.put("/:id", verifyToken, checkRole(["super_admin"]), updateAdmin);

export default router;
