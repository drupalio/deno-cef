import env from "./env.js";
import * as path from "https://deno.land/std@0.55.0/path/mod.ts";
import { copySync } from "https://deno.land/std@0.55.0/fs/mod.ts";

export function cacheDenoModulesLocally() {
	let denoCacheDir = env("deno", {suffix: ""}).cache;
	if (Deno.build.os === "windows") {
		denoCacheDir = denoCacheDir.substr(0, denoCacheDir.length - 6)
	}
	
	const localDenoModuleDir = path.join(Deno.cwd(), "deno_modules");
	copySync(denoCacheDir, localDenoModuleDir);
}

export function updateRunCommand() {
	switch (Deno.build.os) {
		case "windows":
			Deno.writeFileSync(path.join(Deno.cwd(), "run.vbs"), new TextEncoder().encode(`
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "env.bat", 0
Set WshShell = Nothing
`.trim()));

Deno.writeFileSync(path.join(Deno.cwd(), "env.bat"), new TextEncoder().encode(`
set DENO_DIR=./deno_modules
deno.exe run -A app.js
`.trim()));
			break;

		case "darwin":
			break;

		case "linux":
			Deno.writeFileSync(path.join(Deno.cwd(), "run"), new TextEncoder().encode(`
#!/bin/bash
export DENO_DIR=./deno_modules
./deno run -A app.js
`.trim()));
			break;
	}
}

