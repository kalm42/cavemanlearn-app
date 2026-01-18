import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		react(),
	],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.{test,spec}.{ts,tsx}'],
		exclude: ['node_modules', 'e2e'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'src/test/', 'src/paraglide/', '**/*.d.ts', '**/*.config.*'],
			thresholds: {
				lines: 50, // Update to 70 after Phase 2
				functions: 50,
				branches: 50,
				statements: 50,
			},
		},
	},
})
