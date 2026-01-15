import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
	console.error("Error: npm_package_version is not set. This script must be run via npm (e.g., 'npm version patch')");
	process.exit(1);
}

try {
	// read minAppVersion from manifest.json and bump version to target version
	let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
	const { minAppVersion } = manifest;
	manifest.version = targetVersion;
	writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

	// update versions.json with target version and minAppVersion from manifest.json
	let versions = JSON.parse(readFileSync("versions.json", "utf8"));
	versions[targetVersion] = minAppVersion;
	writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

	console.log(`✅ Updated version to ${targetVersion} (requires Obsidian ${minAppVersion})`);
} catch (error) {
	console.error("Error updating version files:", error.message);
	process.exit(1);
}
