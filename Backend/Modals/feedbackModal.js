import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        rating: { type: Number, min: 1, max: 5 },
        category: {
            type: String,
            trim: true,
            enum: ['general', 'food', 'delivery', 'app', 'other'],
            default: 'general',
        },
        message: { type: String, required: true, trim: true },
    },
    { timestamps: true },
);

const feedbackModel =
    mongoose.models.feedback || mongoose.model('feedback', feedbackSchema);

export default feedbackModel;
