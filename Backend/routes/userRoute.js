import express from 'express'
import { loginUser, registerUser, forgotPassword, resetPassword, getCurrentUser, updateCurrentUser } from '../Controllers/userController.js'
import authMiddleware from '../middleware/auth.js'

const userRouter = express.Router()

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/forgot-password', forgotPassword)
userRouter.post('/reset-password/:token', resetPassword)

// PROFILE ROUTES
userRouter.get('/me', authMiddleware, getCurrentUser)
userRouter.put('/me', authMiddleware, updateCurrentUser)

export default userRouter
