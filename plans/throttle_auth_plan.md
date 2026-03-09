# Implementation Plan: Throttling for Auth Routes

## Overview
This plan outlines the steps to implement rate limiting (throttling) specifically for authentication endpoints (`/login` and `/forgot-password`) in the Tahfidz App backend. The objective is to protect the application from brute-force credential stuffing and email spamming while preventing false positives for legitimate users sharing the same IP address (e.g., users in a boarding school/pesantren sharing a single WiFi network). 

To achieve optimal performance and scalability, the rate limiter must use Redis for storage.

## Target Endpoints
The following endpoints in `src/routes/authRoutes.ts` must be throttled:
- `POST /login`
- `POST /forgot-password`

## 1. Dependencies Setup
The implementation requires the `express-rate-limit` library and `rate-limit-redis` to connect it to the existing Redis infrastructure.

Run the following commands to install the required dependencies:
```bash
pnpm install express-rate-limit rate-limit-redis
pnpm install -D @types/express-rate-limit
```
*(Note: `ioredis` should already be installed in the project based on previous configurations)*

## 2. Shared IP Optimization Strategy
To handle environments where multiple users share a single IP address (NAT):
- **DO NOT** use only `req.ip` for the rate limiter key.
- **DO** use a combination of the client's IP address and the email they are attempting to use. 
- **Effect**: If a user spams false logins with `"userA@mail.com"`, only that specific IP + Email combination is blocked. Other users on the same IP logging in with `"userB@mail.com"` will not be affected.

## 3. Implementation Steps

### Step 3.1: Verify Data Store Connection
Ensure there is an exported `ioredis` client instance in the project (e.g., `src/utils/redis.ts`). If it doesn't exist, create it to handle the connection to the Redis server.

### Step 3.2: Create the Throttling Middleware
Create a new file: `src/middleware/throttle.ts`.

In this file, define two exported limiter instances:

**1. `loginLimiter`**
- **Window**: 15 minutes (`15 * 60 * 1000` ms)
- **Max Requests**: 5
- **Store**: `RedisStore` using the `ioredis` client.
- **Key Generator**: `${req.ip}_${req.body.email?.toLowerCase()}`
- **Response**: Return a 429 status code with a JSON response matching the established API format `{"message": "Too many login attempts...", "status": 429}`.

**2. `forgotPasswordLimiter`**
- **Window**: 15 minutes (`15 * 60 * 1000` ms)
- **Max Requests**: 3
- **Store**: `RedisStore` using the `ioredis` client.
- **Key Generator**: `${req.ip}_${req.body.email?.toLowerCase()}`
- **Response**: Return a 429 status code with a standard JSON error response.

### Step 3.3: Apply Middleware to `authRoutes.ts`
Inject the newly created middleware into `src/routes/authRoutes.ts`:

```typescript
import { Router } from 'express';
// ... existing imports
import { loginLimiter, forgotPasswordLimiter } from '../middleware/throttle';

const authRouter = Router();

// Apply loginLimiter ONLY to the /login endpoint
authRouter.post('/login', loginLimiter, login);

// ... other routes (leave unaltered)

// Apply forgotPasswordLimiter ONLY to the /forgot-password endpoint
authRouter.post('/forgot-password', forgotPasswordLimiter, ResetPasswordController.forgotPassword);

export default authRouter;
```

## Additional Notes for AI
- Adhere strictly to the project's formatting guidelines (Prettier, camelCase, no ESLint).
- The `req.body` must be safely parsed; if `req.body.email` is undefined, fallback to another string like `'unknown'` in the `keyGenerator` to prevent errors.
- Do not apply these limits globally (e.g., using `app.use(limiter)`); they must exclusively target the specified auth paths.
