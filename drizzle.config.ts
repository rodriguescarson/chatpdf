import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({
    path: ".env",
});
const connectionStrin: string = process.env.DATABASE_URL as string; 
export default {
    driver: 'pg',
    schema: './src/lib/db/schema.ts',
    dbCredentials: {
        connectionString: connectionStrin,
    }
} satisfies Config;

//npx drizzle-kit push:pg