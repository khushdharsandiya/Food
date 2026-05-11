import Coupon from '../Modals/couponModal.js';

export const listCoupons = async (_req, res) => {
    try {
        const rows = await Coupon.find().sort({ createdAt: -1 }).lean();
        return res.json(rows);
    } catch (err) {
        console.error('listCoupons', err);
        return res.status(500).json({ message: 'Could not load coupons.' });
    }
};

export const createCoupon = async (req, res) => {
    try {
        const code = String(req.body.code || '').trim().toUpperCase();
        const percentOff = Number(req.body.percentOff);
        const minSubtotal = Number(req.body.minSubtotal) || 0;
        const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
        const active = req.body.active !== false;

        if (code.length < 2) {
            return res.status(400).json({ message: 'Code must be at least 2 characters.' });
        }
        if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 90) {
            return res.status(400).json({ message: 'percentOff must be between 1 and 90.' });
        }
        if (expiresAt && Number.isNaN(expiresAt.getTime())) {
            return res.status(400).json({ message: 'Invalid expiresAt date.' });
        }

        const doc = await Coupon.create({
            code,
            percentOff,
            minSubtotal: Math.max(0, minSubtotal),
            expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
            active,
        });
        return res.status(201).json(doc);
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(400).json({ message: 'A coupon with this code already exists.' });
        }
        console.error('createCoupon', err);
        return res.status(500).json({ message: 'Create failed.' });
    }
};

export const patchCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const patch = {};
        if (typeof req.body.active === 'boolean') patch.active = req.body.active;
        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ message: 'Nothing to update.' });
        }
        const doc = await Coupon.findByIdAndUpdate(id, patch, { new: true });
        if (!doc) return res.status(404).json({ message: 'Coupon not found.' });
        return res.json(doc);
    } catch (err) {
        console.error('patchCoupon', err);
        return res.status(500).json({ message: 'Update failed.' });
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        const doc = await Coupon.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Coupon not found.' });
        return res.status(204).send();
    } catch (err) {
        console.error('deleteCoupon', err);
        return res.status(500).json({ message: 'Delete failed.' });
    }
};
