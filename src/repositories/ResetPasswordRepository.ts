import { prisma } from "../utils/prisma";

export const ResetPasswordRepository = {
  async createResetToken(userId: number, token: string, expiresAt: Date) {
    return prisma.resetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  },

  async findToken(token: string) {
    return prisma.resetToken.findUnique({
      where: { token },
      include: { user: true },
    });
  },

  async deleteToken(token: string) {
    return prisma.resetToken.delete({
      where: { token },
    });
  },

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async updateUserPassword(userId: number, newPassword: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { password: newPassword },
    });
  },

  async deleteTokenByUserId(userId: number) {
    return prisma.resetToken.deleteMany({
      where: { userId },
    });
  },

  async findUserById(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  },
};