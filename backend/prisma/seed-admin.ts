import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const displayName = process.env.ADMIN_SEED_DISPLAY_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error('Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, displayName },
    create: { email, passwordHash, displayName },
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
