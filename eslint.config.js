import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import { tanstackConfig } from '@tanstack/eslint-config'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import testingLibrary from 'eslint-plugin-testing-library'
import vitest from '@vitest/eslint-plugin'
import playwright from 'eslint-plugin-playwright'

const eslintConfig = defineConfig(
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	...tanstackConfig,
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
	jsxA11y?.flatConfigs?.strict,
	{
		files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
		...testingLibrary.configs['flat/react'],
		plugins: {
			vitest,
		},
		rules: {
			...vitest.configs.recommended.rules,
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
		},
	},
	{
		...playwright.configs['flat/recommended'],
		files: ['e2e/**/*.{spec}.{ts,tsx}', 'e2e/**/*.{ts,tsx}', 'src/test/global.setup.ts'],
	},
	{
		ignores: [
			'.output/**/*',
			'.tanstack/**/*',
			'.vscode/**/*',
			'coverage/**/*',
			'src/paraglide/**/*',
			'e2e/**/*',
			'playwright-report/**/*',
			'public/mockServiceWorker.js',
		],
	},
)

export default eslintConfig
