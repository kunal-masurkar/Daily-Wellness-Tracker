/**
 * Authentication middleware enforcing active user session.
 * Rejects unauthenticated requests with HTTP 401.
 */
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
