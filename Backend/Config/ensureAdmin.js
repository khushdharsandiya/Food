import bcrypt from 'bcryptjs';
import userModel from '../Modals/userModal.js';

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ADMIN_EMAIL (required):
 * - If this email already exists in the DB → set isAdmin true (ADMIN_PASSWORD in .env optional)
 * - To create a new admin user → also set ADMIN_PASSWORD
 */
export async function ensureDefaultAdmin() {
    const emailRaw = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD?.trim();

    if (!emailRaw) {
        console.warn(
            '[Admin] Add ADMIN_EMAIL to Backend .env. If user already exists, only email is enough; else set ADMIN_PASSWORD too.',
        );
        return;
    }

    const emailLower = emailRaw.toLowerCase();

    try {
        const u = await userModel.findOne({
            email: new RegExp(`^${escapeRegex(emailLower)}$`, 'i'),
        });

        if (u) {
            const wasAdmin = u.isAdmin === true;
            u.isAdmin = true;
            // If ADMIN_PASSWORD is set, update the hash; otherwise keep the existing password
            if (password) {
                const salt = await bcrypt.genSalt(10);
                u.password = await bcrypt.hash(password, salt);
                console.log('[Admin] Admin ready — password synced from ADMIN_PASSWORD:', u.email);
            } else if (!wasAdmin) {
                console.log('[Admin] Promoted to admin — sign in with your existing store password:', u.email);
            }
            await u.save();
            return;
        }

        if (!password) {
            console.warn(
                `[Admin] No account for "${emailRaw}". Register on the store or set ADMIN_PASSWORD in .env to create admin.`,
            );
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const username = process.env.ADMIN_USERNAME?.trim() || 'Admin';

        await userModel.create({
            username,
            email: emailLower,
            password: hashedPassword,
            isAdmin: true,
        });
        console.log('[Admin] Created admin user:', emailLower);
    } catch (e) {
        console.error('[Admin] ensureDefaultAdmin failed:', e?.message || e);
    }
}
