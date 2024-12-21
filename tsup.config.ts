import { defineConfig } from 'tsup';
import { bootstrap } from './src/index';

export default defineConfig(() => {
	return {
		entry: ['src/**/*.ts'],
		format: ['esm'],
		splitting: true,
		clean: true,
		tsconfig: './tsconfig.json',
	};
});