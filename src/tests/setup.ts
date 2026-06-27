import * as dotenv from 'dotenv';

// Load test-specific overrides first, then fall back to .env
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env' });

// When a dedicated test branch URL is provided, use it for all DB access
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
