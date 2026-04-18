import app from './app';
import { prisma } from './utils/prisma';

const PORT = parseInt(process.env.PORT || '5000', 10);

(async () => {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL via Prisma");
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Error connecting to DB:", err);
    process.exit(1);
  }
})();
