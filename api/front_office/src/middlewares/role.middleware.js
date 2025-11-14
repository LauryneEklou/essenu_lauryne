// // Vérifie si l'utilisateur a le rôle requis
// export const checkRole = (roles) => {
//     return (req, res, next) => {
//         if (!roles.includes(req.user.role)) {
//             return res.status(403).json({ message: "Accès interdit" });
//         }
//         next();
//     };
// };


export const checkRole = (...rolesOrArray) => {
    const roles = Array.isArray(rolesOrArray[0]) ? rolesOrArray[0] : rolesOrArray;

    return (req, res, next) => {
        const userRole = req.user && req.user.role;
        if (!userRole || !roles || roles.length === 0) {
            return res.status(403).json({ message: "Accès interdit" });
        }
        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: "Accès interdit" });
        }
        next();
    };
};


