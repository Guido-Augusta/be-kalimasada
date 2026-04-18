import { generateWebToken } from '../../src/utils/jwt';
import { prisma } from '../../src/utils/prisma';
import { Role } from '@prisma/client';

export const getAuthToken = async (role: Role) => {
  let user = await prisma.user.findFirst({
    where: { role }
  });

  if (!user) {
    // If no user exists, we might need to create one, 
    // but for integration tests we usually expect seeded data.
    // For now, let's throw if not found to ensure we are testing correctly.
    throw new Error(`Test user with role ${role} not found. Please run seeds before testing.`);
  }

  return generateWebToken({ id: user.id, role: user.role });
};
