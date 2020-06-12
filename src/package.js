import env from "./env.js";
import * as path from "https://deno.land/std@0.55.0/path/mod.ts";
import { copySync } from "https://deno.land/std@0.55.0/fs/mod.ts";

export function cacheDenoModulesLocally() {
	const denoCacheDir = env("deno", {suffix: ""}).cache;
	const localDenoModuleDir = path.join(Deno.cwd(), "deno_modules");
	copySync(denoCacheDir, localDenoModuleDir);
}

export function updateRunCommand() {
	switch (Deno.build.os) {
		case "windows":
			Deno.writeFileSync(path.join(Deno.cwd(), "run.vbs"), new TextEncoder().encode(`
Set WshShell = CreateObject("WScript.Shell")
Set ShellEnv = WshShell.Environment("SYSTEM") 
ShellEnv("DENO_DIR") = "./deno_modules"
WshShell.Run "deno.exe run -A app.js", 0
Set WshShell = Nothing
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

