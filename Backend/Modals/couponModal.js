import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        percentOff: { type: Number, required: true, min: 1, max: 90 },
        minSubtotal: { type: Number, default: 0, min: 0 },
        expiresAt: { type: Date, default: null },
        active: { type: Boolean, default: true },
    },
    { timestamps: true },
);

export default mongoose.model('Coupon', couponSchema);
