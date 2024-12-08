import { relative, resolve } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
	clean: true,
	dts: false,
	entry: ['src/**/*.ts'],
	format: ["cjs"],
	
	noExternal: [],
	replaceNodeEnv: false,
	skipNodeModulesBundle: true,

	keepNames: true,
	sourcemap: true,
	tsconfig: './tsconfig.json',
});
