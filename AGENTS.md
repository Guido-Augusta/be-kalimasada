# AGENTS.md

## Project Overview

Backend API for Tahfidz Quran application using Express.js + TypeScript + Prisma ORM + PostgreSQL.

## Build & Development Commands

```bash
# Development server with hot reload
pnpm run dev

# Build TypeScript to JavaScript
pnpm run build

# Production start
pnpm run start:prod

# Direct TypeScript execution
pnpm run start

# Prisma commands
pnpm run migrate        # Run migrations in dev
pnpm run generate       # Generate Prisma client
pnpm run studio         # Open Prisma Studio GUI

# Utility scripts
pnpm run generate:quran         # Generate Quran data
pnpm run prisma:seed-alquran    # Seed Al-Quran data
```

## Test Commands

**No test framework is currently configured.** The test script in package.json only echoes an error. Before writing tests, install a testing framework like Jest or Vitest.

## Code Style Guidelines

### Formatting
- **Indent**: 2 spaces (no tabs)
- **Semicolons**: Required
- **Quotes**: Single quotes
- **Trailing commas**: ES5 style (where valid)
- **Print width**: 80 characters
- **Line endings**: LF
- Run Prettier: `npx prettier --write .`

### Imports Order
1. External libraries (express, bcrypt, etc.)
2. Prisma client types
3. Internal utils (prisma, jwt)
4. Internal validation schemas
5. Internal controllers/services/repos

Example:
```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { loginSchema } from '../validation/authValidation';
import * as ustadzRepo from '../repositories/ustadzRepo';
```

### Naming Conventions
- **Files**: camelCase (e.g., `authController.ts`, `ustadzRoutes.ts`)
- **Functions**: camelCase, descriptive (e.g., `getUstadzById`, `registerUstadz`)
- **Types/Interfaces**: PascalCase (e.g., `UstadzData`, `AuthRequest`)
- **Variables**: camelCase (e.g., `userId`, `hashedPassword`)
- **Constants**: UPPER_SNAKE_CASE for true constants

### Error Handling
Always use try-catch in controllers. Return structured error responses:

```typescript
try {
  // logic
} catch (err: unknown) {
  if (err instanceof Error) {
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
  return res.status(500).json({ message: 'Internal server error', status: 500 });
}
```

### TypeScript Rules
- Enable `strict: true` in tsconfig.json
- Use explicit return types for exported functions
- Prefer interfaces over type aliases for object shapes
- Use Zod for runtime validation (schema files in `src/validation/`)

### Architecture Pattern
Follows layered architecture:
- **Routes**: Define API endpoints and middleware
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic layer
- **Repositories**: Database access layer
- **Validation**: Zod schemas for input validation

## Project Structure

```
src/
├── controllers/      # HTTP request handlers
├── routes/           # API route definitions
├── services/         # Business logic
├── repositories/     # Database queries
├── validation/       # Zod validation schemas
├── middleware/       # Express middleware (auth, etc.)
├── utils/            # Helpers (prisma, jwt, etc.)
├── cron/             # Scheduled tasks
data-surah-page/      # Quran JSON data
prisma/
├── schema.prisma     # Database schema
```

## Database (Prisma)

PostgreSQL with Prisma ORM. Key enums:
- `Role`: admin, santri, ustadz, ortu
- `StatusHafalan`: TambahHafalan, Murajaah
- `TahapHafalan`: Level1, Level2, Level3

Always regenerate Prisma client after schema changes:
```bash
pnpm run generate
```

## Environment Variables

Required in `.env`:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
PORT=5000
```
