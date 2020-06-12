"use strict";

import {
    join as pathJoin,
    basename as pathBasename,
  } from "https://deno.land/std@0.55.0/path/mod.ts";
  
const homedir = Deno.dir("home");
const tmpdir = Deno.dir("tmp");


const macos = (name) => {
    if (!homedir) {
        throw new Error("Can't extract the home directory.");
    }

    if (!tmpdir) {
        throw new Error("Can't extract the tmp directory.");
    }

    const library = pathJoin(homedir, "Library");

    return {
        data: pathJoin(library, "Application Support", name),
        config: pathJoin(library, "Preferences", name),
        cache: pathJoin(library, "Caches", name),
        log: pathJoin(library, "Logs", name),
        temp: pathJoin(tmpdir, name),
    };
};

const windows = (name) => {
    if (!homedir) {
        throw new Error("Can't extract the home directory.");
    }

    if (!tmpdir) {
        throw new Error("Can't extract the tmp directory.");
    }

    const appData = Deno.env.get("APPDATA") ||
        pathJoin(homedir, "AppData", "Roaming");
    const localAppData = Deno.env.get("LOCALAPPDATA") ||
        pathJoin(homedir, "AppData", "Local");

    return {
        data: pathJoin(localAppData, name, "Data"),
        config: pathJoin(appData, name, "Config"),
        cache: pathJoin(localAppData, name, "Cache"),
        log: pathJoin(localAppData, name, "Log"),
        temp: pathJoin(tmpdir, name),
    };
};

const linux = (name) => {
    if (!homedir) {
        throw new Error("Can't extract the home directory.");
    }

    if (!tmpdir) {
        throw new Error("Can't extract the tmp directory.");
    }

    const username = pathBasename(homedir);

    return {
        data: pathJoin(
        Deno.env.get("XDG_DATA_HOME") || pathJoin(homedir, ".local", "share"),
        name,
        ),
        config: pathJoin(
        Deno.env.get("XDG_CONFIG_HOME") || pathJoin(homedir, ".config"),
        name,
        ),
        cache: pathJoin(
        Deno.env.get("XDG_CACHE_HOME") || pathJoin(homedir, ".cache"),
        name,
        ),
        log: pathJoin(
        Deno.env.get("XDG_STATE_HOME") || pathJoin(homedir, ".local", "state"),
        name,
        ),
        temp: pathJoin(tmpdir, username, name),
    };
};

export default (name, options = { suffix: "deno" }) => {
    if (typeof name !== "string") {
        throw new TypeError(`Expected string, got ${typeof name}`);
    }

    // Add suffix to prevent possible conflict with native apps
    if (options.suffix) {
        name += `-${options.suffix}`;
    }

    switch (Deno.build.os) {
        case "windows":
            return windows(name);

        case "darwin":
            return macos(name);
            
        case "linux":
            return linux(name);
    }
}
