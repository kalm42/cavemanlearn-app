import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import { tanstackConfig } from '@tanstack/eslint-config'
import tseslint from 'typescript-eslint'

const eslintConfig = defineConfig(
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	...tanstackConfig,
	{
		ignores: ['src/paraglide/**/*'],
	},
)

export default eslintConfig
