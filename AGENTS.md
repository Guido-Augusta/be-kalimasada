# AGENTS.md

## Project Overview

Backend API for Tahfidz Quran application using Express.js + TypeScript + Prisma ORM + PostgreSQL.

## Build & Development Commands

**Package Manager:** pnpm 10.11.0

```bash
# Development server with hot reload (via nodemon)
pnpm dev

# Build TypeScript to JavaScript
pnpm build

# Production server (runs compiled dist)
pnpm start:prod

# Direct TypeScript execution
pnpm start

# Vitest testing
pnpm test           # Run all tests
pnpm test:run       # Run tests once
pnpm test:ui        # Run tests with UI dashboard

# Prisma commands
pnpm migrate        # Run migrations in dev
pnpm generate       # Generate Prisma client
pnpm studio         # Open Prisma Studio GUI

# Utility scripts
pnpm generate:quran         # Generate Quran data
pnpm prisma:seed-alquran    # Seed Al-Quran data
```

## Lint & Format Commands

```bash
# Format all files with Prettier
npx prettier --write .

# Check formatting without writing
npx prettier --check .
```

**Note**: No ESLint is currently configured. Prettier handles all code formatting. Vitest is configured for testing.

## Code Style Guidelines

### Formatting (Prettier)
- **Indent**: 2 spaces, **Semicolons**: Required, **Quotes**: Single
- **Trailing commas**: ES5, **Print width**: 80, **Line endings**: LF
- Run: `npx prettier --write .`

### Imports Order
1. External libs (express, bcrypt) → 2. Prisma types → 3. Utils → 4. Validation → 5. Controllers/services/repos

### Naming Conventions
- **Files**: camelCase (e.g., `authController.ts`, `ustadzRoutes.ts`)
- **Functions**: camelCase, descriptive (e.g., `getUstadzById`, `registerUstadz`)
- **Types/Interfaces**: PascalCase (e.g., `UstadzData`, `AuthRequest`)
- **Variables**: camelCase (e.g., `userId`, `hashedPassword`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Database enums**: PascalCase (e.g., `Role`, `StatusHafalan`)

### Code Patterns

**Controller structure**:
```typescript
export const functionName = async (req: Request, res: Response) => {
  try {
    // validation
    // business logic
    return res.status(200).json({ message: 'Success', status: 200, data: ... });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};
```

**Validation with Zod**:
```typescript
const validation = schema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({
    message: 'Validation failed',
    errors: validation.error.flatten().fieldErrors,
  });
}
const data = validation.data;
```

**Proper error typing**: Always use `unknown` in catch blocks, never `any`. Check with `instanceof Error` before accessing message.

### TypeScript Rules
- Enable `strict: true` in tsconfig.json
- Use explicit return types for exported functions
- Prefer interfaces over type aliases for object shapes
- Use `unknown` for error types in catch blocks
- Use Zod for runtime validation (schema files in `src/validation/`)
- Avoid `any` type; use proper typing

## Architecture & Project Structure

Layered architecture: Routes → Controllers → Services → Repositories → Prisma

```
src/
├── controllers/      # HTTP request handlers
├── routes/           # API route definitions  
├── services/         # Business logic
├── repositories/     # Database queries
├── validation/       # Zod schemas
├── middleware/       # Express middleware
├── utils/            # Helpers (prisma, jwt)
├── cron/             # Scheduled tasks
prisma/schema.prisma # Database schema
```

## Database (Prisma)

PostgreSQL. Key enums: `Role` (admin, santri, ustadz, ortu), `StatusHafalan` (TambahHafalan, Murajaah), `TahapHafalan` (Level1-3), `JenisKelamin` (L, P), `Platform` (web, mobile).

After schema changes: `pnpm run generate`

## Environment Variables

```
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
PORT=5000
```

## API Response Format

Success: `{ "message": "...", "status": 200, "data": {...} }`
Error: `{ "message": "...", "status": 400, "errors": {...} }`

## Key Dependencies

**Framework & ORM:**
- Express 5.1.0 (web framework)
- Prisma 6.13.0 (ORM for PostgreSQL)
- TypeScript 5.9.2

**Authentication & Security:**
- jsonwebtoken 9.0.2 (JWT)
- bcrypt 6.0.0 (password hashing)

**File Upload & Email:**
- multer 2.0.2 (file handling)
- nodemailer 7.0.5 (email sending)

**Validation & Utilities:**
- Zod 4.0.14 (schema validation)
- date-fns 4.1.0 (date utilities)
- date-fns-tz 3.2.0 (timezone support)
- node-cron 4.2.1 (scheduled tasks)
- ioredis 5.10.0 (Redis client)
- cors 2.8.5 (CORS handling)
- dotenv 17.2.1 (environment variables)

**Development & Testing:**
- nodemon 3.1.10 (auto-reload)
- ts-node 10.9.2 (TypeScript execution)
- Vitest 4.0.18 (testing framework)
- @vitest/ui 4.0.18 (test dashboard)
