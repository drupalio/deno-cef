"use strict";

import {
  join as pathJoin,
  //basename as pathBasename,
} from "https://deno.land/std@0.55.0/path/mod.ts";

import xdg from "https://deno.land/x/xdg@v10.5.1/src/mod.deno.ts";

export default (name, options = { suffix: "deno" }) => {
    if (typeof name !== "string") {
        throw new TypeError(`Expected string, got ${typeof name}`);
    }

    // Add suffix to prevent possible conflict with native apps
    if (options.suffix) {
        name += `-${options.suffix}`;
    }

    return {
        data: pathJoin(xdg.data(), name),
        config: pathJoin(xdg.config(), name),
        cache: pathJoin(xdg.cache(), name),
        temp: pathJoin(xdg.runtime(), name),
        log: pathJoin(xdg.state(), name),
    };
}
