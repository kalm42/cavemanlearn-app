import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import { tanstackConfig } from '@tanstack/eslint-config'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import testingLibrary from 'eslint-plugin-testing-library'

const eslintConfig = defineConfig(
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	...tanstackConfig,
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
	jsxA11y?.flatConfigs?.strict,
	{
		files: ['**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
		...testingLibrary.configs['flat/react'],
	},
	{
		ignores: [
			'src/paraglide/**/*',
			'e2e/**/*',
			'playwright-report/**/*',
			'public/mockServiceWorker.js',
		],
	},
)

export default eslintConfig
