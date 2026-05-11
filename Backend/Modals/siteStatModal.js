import mongoose from 'mongoose';

/** Ek hi document: kitni baar site open hui (har browser session = 1, client side se) */
const siteStatSchema = new mongoose.Schema(
    {
        key: { type: String, unique: true, default: 'global' },
        visitCount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true },
);

export default mongoose.model('SiteStat', siteStatSchema);
