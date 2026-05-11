import jwt from 'jsonwebtoken';
import userModel from '../Modals/userModal.js';

const jwtSecret = () => String(process.env.JWT_SECRET ?? '').trim().replace(/^["']|["']$/g, '');

function extractBearer(req) {
    const raw = req.headers.authorization;
    if (!raw || typeof raw !== 'string') return null;
    const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
    return m ? m[1].trim() : null;
}

/** JWT + DB: require isAdmin === true */
const adminAuthMiddleware = async (req, res, next) => {
    const token = extractBearer(req);
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const secret = jwtSecret();
    if (!secret) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    try {
        const decoded = jwt.verify(token, secret);
        const id = decoded.id ?? decoded._id ?? decoded.sub;
        if (!id) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        const user = await userModel.findById(id).select('isAdmin email username');
        if (!user || !user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        req.adminUser = user;
        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return res.status(403).json({ success: false, message });
    }
};

export default adminAuthMiddleware;
