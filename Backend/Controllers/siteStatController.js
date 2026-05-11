import SiteStat from '../Modals/siteStatModal.js';

const KEY = 'global';

/** Frontend calls once per browser session to increment the visit counter */
export const recordVisit = async (_req, res) => {
    try {
        const doc = await SiteStat.findOneAndUpdate(
            { key: KEY },
            { $inc: { visitCount: 1 } },
            { upsert: true, new: true },
        );
        return res.json({ visits: doc.visitCount });
    } catch (e) {
        console.error('recordVisit', e);
        return res.status(500).json({ message: 'Could not record visit' });
    }
};

export const getSiteStats = async (_req, res) => {
    try {
        const doc = await SiteStat.findOne({ key: KEY }).lean();
        return res.json({ visits: doc?.visitCount ?? 0 });
    } catch (e) {
        console.error('getSiteStats', e);
        return res.status(500).json({ message: 'Could not load stats' });
    }
};
