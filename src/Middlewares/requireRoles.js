export const requireRoles = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario || !rolesPermitidos.includes(req.usuario.permiso)) {
    return res.status(403).json({
      message: `Acceso denegado. Se requiere uno de estos permisos: ${rolesPermitidos.join(', ')}`
    });
  }
  next();
};
