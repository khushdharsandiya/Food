import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp: { type: String },
    otpExpiry: { type: Date },
    otpVerified: { type: Boolean, default: false },
    /** When true, user may obtain an admin token via /api/admin/login (protected admin routes) */
    isAdmin: { type: Boolean, default: false, index: true },
});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
