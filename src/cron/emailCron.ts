import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { sendHafalanEmail } from '../utils/sendAccountEmail';

const DELAY_MINUTES = 1;

// Run every minute to check for pending emails
setTimeout(() => {
  cron.schedule('* * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - DELAY_MINUTES * 60 * 1000);

      const pendingEmails = await prisma.emailQueue.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lte: cutoff },
        },
        take: 10,
        orderBy: { createdAt: 'asc' },
      });

      for (const job of pendingEmails) {
        try {
          await sendHafalanEmail({
            ortuName: job.namaOrtu,
            santriName: job.namaSantri,
            tanggalHafalan: job.tanggalHafalan,
            namaSurah: job.namaSurah,
            jumlahAyat: job.jumlahAyat,
            ayatNomorList: job.ayatNomorList
              .split(',')
              .map((n) => parseInt(n, 10)),
            status: job.statusHafalan,
            kualitas: job.kualitas || undefined,
            keterangan: job.keterangan || undefined,
            catatan: job.catatan || undefined,
            emailOrtu: job.emailOrtu,
          });

          await prisma.emailQueue.update({
            where: { id: job.id },
            data: { status: 'SENT', sentAt: new Date() },
          });

          console.log(
            `[EmailQueue] Email terkirim ke ${job.emailOrtu} (id: ${job.id})`
          );
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
          await prisma.emailQueue.update({
            where: { id: job.id },
            data: { status: 'FAILED', error: errorMessage },
          });
          console.error(
            `[EmailQueue] Gagal mengirim email id ${job.id}:`,
            errorMessage
          );
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('[EmailQueue] Cron error:', error.message);
      }
    }
  });

  console.log(
    '[EmailQueue] Cron job started - checking pending emails every minute'
  );
}, 10000);
