import cron from 'node-cron';
import { updatePeringkatSantri } from '../services/santriService';
import { prisma } from '../utils/prisma';

setTimeout(() => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await updatePeringkatSantri();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error updating ranking:', error.message);
      }
    }
  });

  cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date();
      await prisma.resetToken.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error running cron job:', error.message);
      }
    }
  });
}, 10000);
