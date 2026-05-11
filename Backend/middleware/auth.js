import jwt from 'jsonwebtoken'

const jwtSecret = () => String(process.env.JWT_SECRET ?? '').trim().replace(/^["']|["']$/g, '')

function extractBearer(req) {
    const raw = req.headers.authorization
    if (!raw || typeof raw !== 'string') return null
    const m = /^Bearer\s+(.+)$/i.exec(raw.trim())
    return m ? m[1].trim() : null
}

const authMiddleware = (req, res, next) => {
    const token = req.cookies?.token || extractBearer(req)

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token Missing' })
    }

    const secret = jwtSecret()
    if (!secret) {
        console.error('JWT_SECRET is not set in environment')
        return res.status(500).json({ success: false, message: 'Server configuration error' })
    }

    try {
        const decoded = jwt.verify(token, secret)
        const id = decoded.id ?? decoded._id ?? decoded.sub
        if (!id) {
            return res.status(403).json({ success: false, message: 'Invalid token payload' })
        }
        req.user = { _id: id, email: decoded.email };
        next();
    }
    catch (err) {
        const message = err.name === 'TokenExpiredError' ? 'Token Expired' : 'Invalid Token';
        res.status(403).json({ success: false, message })
    }
}

export default authMiddleware;
