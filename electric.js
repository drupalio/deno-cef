"use strict";

import * as path from "https://deno.land/std@0.55.0/path/mod.ts";
import { copySync, existsSync } from "https://deno.land/std@0.55.0/fs/mod.ts";
import * as colors from "https://deno.land/std@0.55.0/fmt/colors.ts";
import { decompress } from "https://deno.land/x/lz4@v0.1.1/mod.ts";
import { readZip } from "https://raw.githubusercontent.com/hayd/deno-zip/6ab1cf5081dbe63d55016a74c79df98025e2b5e3/mod.ts";
import env from "./src/env.js";
import { crossPlatformPathConversion, printProgressBar } from "./src/util.js";
import { cacheDenoModulesLocally, updateRunCommand } from "./src/package.js";

/**
 * Returns the cache directory for DenoCEF.
 */
function getCacheDirectory() {
    return env("denocef", {suffix: ""}).cache;
}


/**
 * Creates a new cache directory for DenoCEF is none exists.
 */
function createCacheDirectory() {
    const cacheDirectory = getCacheDirectory();

    if (!existsSync(cacheDirectory)) {
        Deno.mkdirSync(cacheDirectory);
    }
}


/**
 * Fetches, decompresses, and unzips a DenoCEF binary from the repository. Due to
 * the size of the binaries, this process will take a long time, and so displays
 * some progress over the process.
 * 
 * @param {string} platformName the name of the platform (either "windows", 
 * "linux", or "darwin")
 * 
 * @todo Implement a more dynamic progress bar. Currently implementations using
 * reader is not supported as of Deno v1.0.2 for fetch API, preventing a fetch
 * status bar. Additionally, the compression and zip libs don't support these
 * features as well, at least not easily.
 */
async function fetchCef(platformName) {
    let cefBinaryUrl = `https://github.com/denjucks/deno-cef/releases/download/0.0.1/${platformName}-denocef.zip.xz`;

    // Progress message for the initial fetch
    console.log();
    console.log(colors.cyan(` Step 1/5)`));
    console.log("    " + `
    Fetching the DenoCEF binaries for ${platformName}. Please wait, as this 
    process will take a while due to the large size of the binaries.`.trim());
    printProgressBar(0,5);
    console.log();

    // Performing the fetch
    await fetch(cefBinaryUrl)
        .then(response => response.blob())
        .then(async (data) => {
            // Making a platform specific directory in the cache if one does
            // not already exist
            let cacheDirectory = path.join(getCacheDirectory(), platformName);
            try { Deno.mkdirSync(cacheDirectory) } catch(e) {}

            // Progress message for writing the binaries to disk
            console.log(colors.cyan(` Step 2/5)`));
            console.log("    " + `
    Writing the binaries to
    ${cacheDirectory}`.trim());
            printProgressBar(1,5);
            console.log();

            // Writing the binaries to the cache
            Deno.writeFileSync(path.join(cacheDirectory, platformName+"-denocef.zip.xz"), await data.arrayBuffer());
            data = undefined;

            // Progress message for decompressing the fetched binaries.
            console.log(colors.cyan(" Step 3/5)"));
            console.log("    Decompressing the binaries. Please wait as this process will take a while.");
            printProgressBar(2,5);
            console.log();

            // Decompressing the binaries and removing the old compressed binary file
            Deno.writeFileSync(path.join(cacheDirectory, "denocef.zip"), decompress(Deno.readFileSync(path.join(cacheDirectory, platformName+"-denocef.zip.xz"))))
            Deno.removeSync(path.join(cacheDirectory, platformName+"-denocef.zip.xz"));

            // Progress message for unzipping the binaries.
            console.log(colors.cyan(" Step 4/5)"));
            console.log("    Unarchiving the binaries. Please wait as this process will take a while.");
            printProgressBar(3,5);
            console.log();

            // Unzipping the decompressed binaries
            let zip = await readZip(path.join(cacheDirectory, "denocef.zip"));
            await zip.unzip(cacheDirectory);
            zip = undefined;

            // Removing the zipped archive
            Deno.removeSync(path.join(cacheDirectory, "denocef.zip"));
        });
}


/**
 * Helper function to create a platform cache directory and run the fetching,
 * decompressing, and unzipping function
 * 
 * @param {string} platformName the name of the platform (either "windows", 
 * "linux", or "darwin")
 */
async function downloadCefToCache(platformName) {
    platformName = platformName || Deno.build.os;

    switch (platformName) {
        case "windows":
            Deno.mkdirSync(path.join(getCacheDirectory(), "windows"));
            break;

        case "darwin":
            Deno.mkdirSync(path.join(getCacheDirectory(), "darwin"));
            break;

        case "linux":
            Deno.mkdirSync(path.join(getCacheDirectory(), "linux"));
            break;
    }

    await fetchCef(platformName);
}


/**
 * Clears the cache for a platform.
 * 
 * @param {string} platformName the name of the platform (either "windows", 
 * "linux", or "darwin")
 */
function clearCefCache(platformName) {
    Deno.removeSync(path.join(getCacheDirectory(), platformName || Deno.build.os), { recursive: true });
}


/**
 * Creates a new DenoCEF project in the current directory
 * 
 * @param {string} platformName the name of the platform (either "windows", 
 * "linux", or "darwin")
 */
function createNewProject(platformName) {
    const cacheDirectoryPath = getCacheDirectory();
    const platformCacheDirectoryPath = path.join(cacheDirectoryPath, platformName || Deno.build.os);

    const __dirname = crossPlatformPathConversion(Deno.cwd());
    
    if (existsSync(path.join(__dirname, "DenoCefProject"))) {
        console.log(colors.yellow("Project already exists in this directory. No new project created."));
    } else {
        console.log(colors.cyan(" Step 5/5)"));
        console.log(`    Copying ${platformName} cache into new project folder`);
        printProgressBar(4,5);
        console.log();
        copySync(platformCacheDirectoryPath, path.join(__dirname, "DenoCefProject"));
        
        console.log(` Finished creating the new DenoCEF project`);
        printProgressBar(5,5);
        console.log();
    }
}



/**
 * The Electric CLI
 */
if (import.meta.main) {
    let platformName = Deno.args[1] || Deno.build.os;
    if (Deno.build.os === "darwin") {
        console.log(colors.red("DenoCEF currently does not support MacOS, but is planned in the future. For the time being, please develop your application on either Windows or Linux until full support is added."));
    } else {
        switch (Deno.args[0]) {
            case "create":
                if (platformName === "mac") {platformName = "darwin";}
                
                if (!existsSync(getCacheDirectory())) {
                    createCacheDirectory();
                }

                if (!existsSync(path.join(getCacheDirectory(), platformName))) {
                    await downloadCefToCache(platformName);
                }

                createNewProject(platformName);
                break;

            case "refresh":
                if (platformName === "mac") {platformName = "darwin";}

                clearCefCache(platformName);
                await downloadCefToCache(platformName);
                break;

            case "package":
				cacheDenoModulesLocally();
				updateRunCommand();
                break;

            default:
                console.log(`
${colors.cyan("Electric")} - A CLI for DenoCEF
Copyright 2020 - Anthony Mancini
Licensed under an MIT license

Requirements:
-------------

    Before running Electric commands, it is recommended you have approximately
    4 GB of available RAM and 5 GB of disk space (at minimum you should have
    2.5 GB of available RAM and 3 GB of disk space). These requirements are
    only for downloading the binaries, and less RAM is needed to actually run
    the DenoCEF programs.


Available Commands:
-------------------

    ${colors.cyan("create [<platform>]")}
        | Creates a new DenoCEF project in the current directory. If no
        | DenoCEF binaries are found for the target platform, first fetches
        | those binaries from the repository and caches them. Once cached,
        | this command will use the cached binaries to significantly speed
        | up the process of creating new DenoCEF apps.
        |
        | Note that if no platform is chosen, your platform is used (for
        | example if you are running this on Windows, the Windows binaries
        | will be fetched).

    ${colors.cyan("refresh [<platform>]")}
        | Clears the cache of the binaries for a particular platform, or your
        | platform if none is chosen.

    ${colors.cyan("package")}
        | Packages your DenoCEF application into a single zip file that can
        | be shipped to other users.
`);
        }
    }
}



