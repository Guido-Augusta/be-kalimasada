import { Router } from 'express';
import { login, logout } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { ResetPasswordController } from '../controllers/ResetPasswordController';

const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/logout/:id', logout);

authRouter.post("/verify-old-password", authMiddleware, ResetPasswordController.verifyOldPassword);
authRouter.post("/change-password", authMiddleware, ResetPasswordController.resetPasswordWithOldPassword);
authRouter.post("/forgot-password", ResetPasswordController.forgotPassword);
authRouter.post("/verify-token", ResetPasswordController.verifyResetToken);
authRouter.post("/reset-password", ResetPasswordController.resetPassword);

export default authRouter;
