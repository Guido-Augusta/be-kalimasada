import bcrypt from 'bcrypt';
import { sendResetPasswordEmail } from '../utils/sendAccountEmail'; 
import { ResetPasswordRepository } from '../repositories/ResetPasswordRepository';

export const ResetPasswordService = {
  async forgotPassword(email: string) {
    const user = await ResetPasswordRepository.findUserByEmail(email);
    if (!user) {
      throw new Error('User with that email does not exist.');
    }
    try {
      await ResetPasswordRepository.deleteTokenByUserId(user.id);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error deleting reset token:', error.message);
      }
    }

    // 6 digit
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 

    await ResetPasswordRepository.createResetToken(user.id, token, expiresAt);

    await sendResetPasswordEmail(user.email, token);

    return { message: 'Password reset link has been sent to your email.' };
  },

  async verifyToken(token: string) {
    const resetToken = await ResetPasswordRepository.findToken(token);
    if (!resetToken) {
      return false;
    }
    
    if (new Date() > resetToken.expiresAt) {
      await ResetPasswordRepository.deleteToken(token); 
      return false; 
    }
    return true;
  },

  async resetPasswordWithToken(token: string, newPassword: string) {
    const resetToken = await ResetPasswordRepository.findToken(token);
    if (!resetToken) {
      throw new Error('Invalid or expired token.');
    }

    if (new Date() > resetToken.expiresAt) {
      await ResetPasswordRepository.deleteToken(token); 
      throw new Error('Token has expired.');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await ResetPasswordRepository.updateUserPassword(resetToken.userId, hashedPassword);
    await ResetPasswordRepository.deleteToken(token);

    return { message: 'Password has been reset successfully.' };
  },
};