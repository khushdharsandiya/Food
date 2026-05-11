import validator from 'validator';
import feedbackModel from '../Modals/feedbackModal.js';

const CATEGORIES = new Set(['general', 'food', 'delivery', 'app', 'other']);

/** POST /api/feedback — public; stores review in MongoDB */
export const submitFeedback = async (req, res) => {
    try {
        const name = String(req.body.name ?? '').trim();
        const email = String(req.body.email ?? '').trim();
        const message = String(req.body.message ?? '').trim();
        const categoryRaw = String(req.body.category ?? 'general').trim().toLowerCase();
        let rating = req.body.rating;

        if (name.length < 2) {
            return res.status(400).json({ success: false, message: 'Please enter your name (at least 2 characters).' });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }
        if (message.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Please write at least 10 characters in your feedback.',
            });
        }

        const category = CATEGORIES.has(categoryRaw) ? categoryRaw : 'general';

        if (rating !== undefined && rating !== null && rating !== '') {
            rating = Number(rating);
            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                return res.status(400).json({ success: false, message: 'Rating must be a whole number from 1 to 5.' });
            }
        } else {
            rating = undefined;
        }

        await feedbackModel.create({
            name,
            email,
            message,
            category,
            ...(rating !== undefined ? { rating } : {}),
        });

        return res.status(201).json({
            success: true,
            message: 'Thank you! Your feedback has been saved.',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Could not save feedback. Try again later.' });
    }
};
