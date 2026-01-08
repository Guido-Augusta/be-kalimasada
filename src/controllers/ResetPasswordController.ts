import { ResetPasswordService } from '../services/ResetPasswordService';
import { ResetPasswordRepository } from '../repositories/ResetPasswordRepository';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { AuthRequest } from "../middleware/auth";

export const ResetPasswordController = {
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    try {
      const result = await ResetPasswordService.forgotPassword(email);
      return res.status(200).json({ message: 'Password reset link has been sent to your email.', status: 200, data: result });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(400).json({ error: 'An unknown error occurred.' });
    }
  },

  async verifyResetToken(req: Request, res: Response) {
    const { token } = req.body;
    try {
      const isValid = await ResetPasswordService.verifyToken(token);
      if (isValid) {
        return res.status(200).json({ message: 'Token is valid.', status: 200 });
      } else {
        return res.status(400).json({ error: 'Invalid or expired token.', status: 400 });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(400).json({ error: 'An unknown error occurred.' });
    }
  },

  async resetPassword(req: Request, res: Response) {
    // const { token } = req.params;
    const { newPassword, token } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    try {
      const result = await ResetPasswordService.resetPasswordWithToken(token, newPassword);
      return res.status(200).json({ message: 'Password has been reset successfully.', status: 200, data: result });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(400).json({ error: 'An unknown error occurred.' });
    }
  },

  // Tambahkan fungsi baru di dalam ResetPasswordController
  async verifyOldPassword(req: AuthRequest, res: Response) {
    const userId = req.user?.id;
    const { oldPassword } = req.body;

    try {
      const user = await ResetPasswordRepository.findUserById(userId as number);
    if (!user) {
      return res.status(404).json({ error: 'User not found.', status: 404 });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (isMatch) {
      return res.status(200).json({ message: 'Old password verified successfully.', status: 200 });
    } else {
      return res.status(400).json({ error: 'Incorrect old password.', status: 400 });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'An unknown error occurred.' });
  }
},

  async resetPasswordWithOldPassword(req: AuthRequest, res: Response) {
    const userId = req.user?.id; 
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    try {
      const user = await ResetPasswordRepository.findUserById(userId as number);
      if (!user) {
        return res.status(404).json({ error: 'User not found.', status: 404 });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect old password.', status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await ResetPasswordRepository.updateUserPassword(userId as number, hashedPassword);

      return res.status(200).json({ message: 'Password has been updated successfully.', status: 200, data: { userId } });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(500).json({ error: 'An unknown error occurred.' });
    }
  },
};