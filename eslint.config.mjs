import js from '@eslint/js'
import globals from 'globals'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
	{ ignores: ['node_modules/', 'dist/'] },
	js.configs.recommended,
	prettierRecommended,
	{
		files: ['src/js/**/*.js', 'src/data/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: { ...globals.browser }
		}
	},
	{
		files: ['config/**/*.js'],
		languageOptions: {
			sourceType: 'commonjs',
			globals: { ...globals.node }
		}
	},
	{
		files: ['**/*.mjs'],
		languageOptions: {
			sourceType: 'module',
			globals: { ...globals.node }
		}
	},
	{
		// Vendored a11y-dialog build. Do not change it here.
		files: ['src/js/components/dialog.js'],
		rules: { 'no-useless-assignment': 'off' }
	},
	{
		rules: {
			'no-unused-vars': 'off',
			'no-undef': 'off'
		}
	}
]
