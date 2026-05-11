import userModel from "../Modals/userModal.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import crypto from "node:crypto";
import { isMailConfigured, sendPasswordResetLink } from "../utils/mail.js";

const jwtSecret = () => String(process.env.JWT_SECRET ?? '').trim().replace(/^["']|["']$/g, '')
const isStrongPassword = (value) =>
    validator.isStrongPassword(String(value || ''), {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })

/** Username must include at least one letter; numbers-only (e.g. 12345) not allowed. */
const isValidUsername = (value) => {
    const s = String(value ?? '').trim();
    if (s.length < 2 || s.length > 80) return false;
    if (/^\d+$/.test(s)) return false;
    return /\p{L}/u.test(s);
};

/** Customer storefront URL for password-reset links (not the admin panel). */
const customerSiteOrigin = () =>
    String(
        process.env.FRONTEND_RESET_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
    )
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\/$/, '');

const createToken = (id, email) => {
    const secret = jwtSecret()
    if (!secret) {
        throw new Error('JWT_SECRET is not configured')
    }
    return jwt.sign({ id: String(id), email }, secret, { expiresIn: '7d' })
}

//LOGIN FUNCTION
const loginUser = async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: "User Doesnt Exits" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid Creds" })
        }

        const token = createToken(user._id, user.email);
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        })
    }
    catch (error) {
        console.log(error)
        if (error.message === 'JWT_SECRET is not configured') {
            return res.status(500).json({ success: false, message: 'Server configuration error' })
        }
        res.json({ success: false, message: "Error" })
    }
}

//REGISTER FUNCTION

const registerUser = async (req, res) => {
    const { email, password } = req.body;
    const username = String(req.body?.username ?? '').trim();

    try {
        const exists = await userModel.findOne({ email })
        if (exists) {
            return res.json({ success: false, message: "User Already Exists" })
        }

        //VALIDATION
        if (!isValidUsername(username)) {
            return res.json({
                success: false,
                message:
                    'Username must be 2–80 characters, include at least one letter, and cannot be only numbers.',
            })
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please Enter a Valid Email" })
        }

        if (!isStrongPassword(password)) {
            return res.json({
                success: false,
                message: "Please enter a strong password (8+ chars, uppercase, lowercase, number, special character)",
            })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new userModel({
            username: username,
            email,
            password: hashedPassword
        })

        const user = await newUser.save()

        const token = createToken(user._id, user.email);
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        })

    } catch (error) {
        console.log(error)
        if (error.message === 'JWT_SECRET is not configured') {
            return res.status(500).json({ success: false, message: 'Server configuration error' })
        }
        res.json({ success: false, message: "Error" })
    }
}

// FORGOT PASSWORD → email with JWT reset link (or dev: link in console + devResetUrl).
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }

        const user = await userModel.findOne({ email });

        const serverMeta = {
            generatedAt: new Date().toISOString(),
            referenceId: crypto.randomUUID(),
            validForMinutes: 60,
            method: 'reset-link-email',
        };

        if (!user) {
            return res.json({
                success: true,
                message: 'If this email is registered, you will receive a reset link shortly.',
                server: { ...serverMeta, linkIssued: false },
            });
        }

        const useConsoleFallback =
            !isMailConfigured() &&
            (String(process.env.MAIL_LOG_RESET_LINK_TO_CONSOLE || '').toLowerCase() === 'true' ||
                String(process.env.MAIL_LOG_OTP_TO_CONSOLE || '').toLowerCase() === 'true');

        if (!isMailConfigured() && !useConsoleFallback) {
            return res.status(503).json({
                success: false,
                message:
                    'Email is not configured. Set SMTP_USER and SMTP_PASS in Backend/.env, or set MAIL_LOG_RESET_LINK_TO_CONSOLE=true to print the reset link in the server terminal (local dev).',
            });
        }

        const secret = jwtSecret();
        if (!secret) {
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }

        const token = jwt.sign(
            { id: String(user._id), email: user.email },
            `${secret}${user.password}`,
            { expiresIn: '1h' },
        );

        const base = customerSiteOrigin();
        const resetUrl = `${base}/reset-password/${encodeURIComponent(token)}`;

        if (useConsoleFallback) {
            console.log('\n========== PASSWORD RESET LINK (dev / no SMTP) ==========');
            console.log('Email:', user.email);
            console.log('Open in browser:', resetUrl);
            console.log('==========================================================\n');
        } else {
            try {
                await sendPasswordResetLink(user.email, resetUrl, user.username);
            } catch (mailErr) {
                console.error(mailErr);
                return res.status(500).json({
                    success: false,
                    message:
                        'Could not send email. Check SMTP settings (Gmail needs an App Password with 2-Step Verification).',
                });
            }
        }

        res.json({
            success: true,
            message: useConsoleFallback
                ? 'Development mode: use the link below or in the server console to open the reset page.'
                : 'We sent a password reset link to your email. It expires in 1 hour.',
            server: {
                ...serverMeta,
                linkIssued: true,
                delivery: useConsoleFallback ? 'console' : 'email',
                emailSent: !useConsoleFallback,
                devConsole: useConsoleFallback,
                userId: String(user._id),
                ...(useConsoleFallback ? { devResetUrl: resetUrl } : {}),
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error generating reset link' });
    }
};

// RESET PASSWORD via JWT link
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Use a strong password (8+ chars, uppercase, lowercase, number, special character)',
            });
        }

        // Decode first to get user id
        const decoded = jwt.decode(token);
        if (!decoded?.id) {
            return res.status(400).json({ success: false, message: 'Invalid reset token' });
        }

        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        jwt.verify(token, `${jwtSecret()}${user.password}`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user.password = hashedPassword;
        await user.save();

        const updatedAt = new Date().toISOString();
        console.log('\n========== PASSWORD UPDATED (JWT RESET LINK) ==========');
        console.log('Email:   ', user.email);
        console.log('User ID: ', String(user._id));
        console.log('Time:    ', updatedAt);
        console.log('===================================================\n');

        res.json({
            success: true,
            message: 'Password reset successfully. You can sign in with your new password.',
            server: {
                updatedAt,
                userId: String(user._id),
                confirmationRef: crypto.randomUUID(),
            },
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Reset link is invalid or expired' });
    }
};

// CURRENT USER PROFILE
const getCurrentUser = async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const safe = {
            _id: user._id,
            id: user._id,
            username: user.username,
            email: user.email,
        };
        res.json({ success: true, user: safe });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
};

// UPDATE CURRENT USER PROFILE (basic fields only)
const updateCurrentUser = async (req, res) => {
    try {
        const updates = {};
        if (req.body.username) updates.username = req.body.username;

        const updated = await userModel
            .findByIdAndUpdate(req.user._id, updates, { new: true })
            .select('-password')
            .lean();

        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                _id: updated._id,
                id: updated._id,
                username: updated.username,
                email: updated.email,
            },
            server: {
                savedAt: new Date().toISOString(),
                syncNote: 'Username saved to MongoDB (Foodie_frenzy database).',
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
};

export { loginUser, registerUser, forgotPassword, resetPassword, getCurrentUser, updateCurrentUser }