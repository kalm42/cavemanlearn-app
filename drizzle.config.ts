import { config as dotenvConfig } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenvConfig({ path: ['.env.local', '.env'] })

const config = defineConfig({
	out: './drizzle',
	schema: './src/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL ?? '',
	},
})

export default config
