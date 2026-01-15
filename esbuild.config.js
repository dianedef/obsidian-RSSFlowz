const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv[2] === 'production';

const context = {
	banner: {
		js: '/* This is an auto-generated file. */',
	},
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
	],
	format: 'cjs',
	target: 'es2018',
	logLevel: 'info',
	sourcemap: production ? false : 'inline',
	treeShaking: true,
	outfile: 'main.js',
	minify: production,
};

async function build() {
	if (production) {
		await esbuild.build(context);
		console.log('✅ Production build complete');
	} else {
		const ctx = await esbuild.context(context);
		await ctx.watch();
		console.log('👀 Watching for changes...');
	}
}

build().catch((error) => {
	console.error('❌ Build failed:', error);
	process.exit(1);
});
