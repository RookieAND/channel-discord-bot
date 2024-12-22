import { defineConfig } from 'tsup';

export default defineConfig(() => {
	return {
		entry: ['src/**/*.ts'],
		format: ['esm'],
		splitting: true,
		clean: true,
		tsconfig: './tsconfig.json',
	};
});