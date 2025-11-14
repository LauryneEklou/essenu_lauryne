import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from 'cookie-parser';
import authRoutes from "./routes/auth.route.js";
import connection from "./config/db.js";
import adminRoutes from "./routes/admin.route.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cookieParser());

// Enable CORS for front-end with credentials (adjust origin in production)
app.use(cors({ origin: ['http://localhost:3000',  'http://localhost:4000'], credentials: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
// Alias pour compatibilité ascendante : certains bundles front utilisent encore /api/admins
app.use("/api/admins", adminRoutes);

export default app;
