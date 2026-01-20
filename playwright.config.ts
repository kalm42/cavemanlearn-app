import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
	},
	projects: [
		// Setup project - runs first to authenticate
		{
			name: 'setup',
			testMatch: /global\.setup\.ts/,
			testDir: './src/test',
		},
		// Browser projects - depend on setup and use saved auth state
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'playwright/.clerk/user.json',
			},
			dependencies: ['setup'],
		},
		{
			name: 'firefox',
			use: {
				...devices['Desktop Firefox'],
				storageState: 'playwright/.clerk/user.json',
			},
			dependencies: ['setup'],
		},
		{
			name: 'webkit',
			use: {
				...devices['Desktop Safari'],
				storageState: 'playwright/.clerk/user.json',
			},
			dependencies: ['setup'],
		},
	],
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
	},
})
