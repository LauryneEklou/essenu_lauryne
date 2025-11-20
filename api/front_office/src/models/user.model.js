import connection from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export const createUser = (userData, callback) => {
    const { first_name, last_name, email, password, role } = userData;
    const uuid = uuidv4();

    const sql = `INSERT INTO users (uuid, first_name, last_name, email, password, role)
               VALUES (?, ?, ?, ?, ?, ?)`;
    connection.query(sql, [uuid, first_name, last_name, email, password, role], callback);
};

export const findUserByEmail = (email, callback) => {
    connection.query("SELECT * FROM users WHERE email = ?", [email], callback);
};

// Find user by id
export const findUserById = (id, callback) => {
    connection.query("SELECT * FROM users WHERE id = ?", [id], callback);
};

// Récupérer tous les administrateurs
export const getAllAdmins = (callback) => {
    // Renvoie désormais tous les utilisateurs pour l'interface Super Admin
    // Inclure la date de création si présente dans la table
    const sql = "SELECT id, first_name, last_name, email, role, status, created_at FROM users ORDER BY id DESC";
    connection.query(sql, callback);
};

// Récupérer les utilisateurs par role
export const getUsersByRole = (role, callback) => {
    const sql = "SELECT id, first_name, last_name, email, role, status, created_at FROM users WHERE role = ? ORDER BY id DESC";
    connection.query(sql, [role], callback);
};

// Créer un nouvel administrateur
export const createAdmin = (adminData, callback) => {
    // Check if email already exists to return a friendly error
    findUserByEmail(adminData.email, (err, results) => {
        if (err) return callback(err);
        if (Array.isArray(results) && results.length > 0) {
            const duplicateErr = new Error('Email already exists');
            duplicateErr.code = 'ER_DUP_ENTRY';
            return callback(duplicateErr);
        }

        // generate uuid like createUser does
        const uuid = uuidv4();
        const sql = "INSERT INTO users (uuid, first_name, last_name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?, 'active')";
        connection.query(sql, [uuid, adminData.first_name, adminData.last_name, adminData.email, adminData.password, adminData.role], callback);
    });
};

// Changer le statut d’un administrateur
export const toggleAdminStatus = (id, status, callback) => {
    const sql = "UPDATE users SET status = ? WHERE id = ?";
    connection.query(sql, [status, id], callback);
};

// Changer le statut d’un utilisateur (générique)
export const toggleUserStatusById = (id, status, callback) => {
    const sql = "UPDATE users SET status = ? WHERE id = ?";
    connection.query(sql, [status, id], callback);
};

// Récupérer un utilisateur par id (déjà fourni but ensure consistent signature)
export const getUserById = (id, callback) => {
    const sql = "SELECT id, first_name, last_name, email, role, status, created_at FROM users WHERE id = ? LIMIT 1";
    connection.query(sql, [id], callback);
};

// Supprimer un administrateur
export const deleteAdmin = (id, callback) => {
    const sql = "DELETE FROM users WHERE id = ?";
    connection.query(sql, [id], callback);
};

// Mettre à jour un administrateur (payload peut contenir first_name, last_name, email, role, password)
export const updateAdmin = (id, payload, callback) => {
    const fields = [];
    const values = [];
    if(payload.first_name !== undefined){ fields.push('first_name = ?'); values.push(payload.first_name); }
    if(payload.last_name !== undefined){ fields.push('last_name = ?'); values.push(payload.last_name); }
    if(payload.email !== undefined){ fields.push('email = ?'); values.push(payload.email); }
    if(payload.role !== undefined){ fields.push('role = ?'); values.push(payload.role); }
    if(payload.password !== undefined){ fields.push('password = ?'); values.push(payload.password); }
    if(fields.length === 0) return callback(null);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    connection.query(sql, values, callback);
};
const Users = {
    createUser,
    findUserByEmail,
    findUserById,
    getAllAdmins,
    getUsersByRole,
    createAdmin,
    toggleAdminStatus,
    deleteAdmin,
    updateAdmin
};
export default Users;
