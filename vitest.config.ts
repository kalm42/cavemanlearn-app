import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const sharedPlugins = [
	viteTsConfigPaths({
		projects: ['./tsconfig.json'],
	}),
]

export default defineConfig({
	plugins: [...sharedPlugins, react()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					globals: true,
					environment: 'jsdom',
					setupFiles: ['./src/test/setup.ts'],
					include: ['src/**/*.{test,spec}.{ts,tsx}'],
					exclude: ['node_modules', 'e2e', 'src/**/*.integration.test.ts'],
				},
			},
			{
				plugins: sharedPlugins,
				test: {
					name: 'integration',
					globals: true,
					environment: 'node',
					setupFiles: ['./src/test/integration/setup.ts'],
					include: ['src/**/*.integration.test.ts'],
					testTimeout: 1_000, // 1 second
				},
			},
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['node_modules/', 'src/test/', 'src/paraglide/', '**/*.d.ts', '**/*.config.*'],
			thresholds: {
				lines: 45, // Set to 50 after Phase 1, then 70 after Phase 2
				functions: 25,
				branches: 50,
				statements: 45,
			},
		},
	},
})
