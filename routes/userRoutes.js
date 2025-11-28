import express from 'express';
import { createUser, loginUser, forgotPasswordController, refreshToken, resetpassword, updateUserDetails, userDetails, verifyForgotPasswordOtp } from '../controllers/userController.js'
import auth from '../middleware/auth.js'
import upload from '../middleware/multer.js'

const userRouter = express.Router();

userRouter.post('/register', createUser);
userRouter.post('/login', loginUser);
userRouter.put('/update-user',auth,updateUserDetails)
userRouter.put('/forgot-password',forgotPasswordController)
userRouter.put('/verify-forgot-password-otp',verifyForgotPasswordOtp)
userRouter.put('/reset-password',resetpassword)
userRouter.post('/refresh-token',refreshToken)
userRouter.get('/user-details',auth,userDetails)


export default userRouter