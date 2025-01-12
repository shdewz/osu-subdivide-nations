import archiver from "archiver";
import esbuild from "esbuild";
import fs from "fs-extra";
import { copy } from "esbuild-plugin-copy";
import json_plugin from "./build_plugins/json_plugin.mjs";
import onEndConsole from "./build_plugins/onEndConsole.mjs";

const outdir = "build";

async function deleteOldDir() {
    await fs.remove(outdir);
}

async function runEsbuild({ buildPath, manifestPath, watch = false }) {
    const esbuildOptions = {
        entryPoints: [
            "src/flags.json",
            "src/content-script/osu/content.ts",
            "src/content-script/wybin/content.ts",
            "src/ui/popup/popup.ts",
            "src/ui/popup/popup.css",
        ],
        bundle: true,
        outdir: buildPath,
        minify: !watch,
        plugins: [
            copy({
                assets: {
                    from: ["./src/assets/**"],
                    to: ["./assets"],
                },
            }),
            copy({
                globbyOptions: {
                    ignore: ["**/*.ts", "**/*.css"],
                },
                assets: {
                    from: ["./src/ui/**"],
                    to: ["./ui"],
                },
            }),
            copy({
                assets: {
                    from: ["./src/_locales/**"],
                    to: ["./_locales"],
                },
            }),
            json_plugin(),
            onEndConsole(),
            copy({
                assets: {
                    from: [manifestPath],
                    to: ["./manifest.json"],
                },
            }),
        ],
    };

    return watch ? esbuild.context(esbuildOptions) : esbuild.build(esbuildOptions);
}

async function zipFolder(dir) {
    const output = fs.createWriteStream(`${dir}.zip`);
    const archive = archiver("zip", {
        zlib: { level: 9 },
    });
    archive.pipe(output);
    archive.directory(dir, false);
    await archive.finalize();
}

async function build() {
    const args = process.argv.slice(2);

    let isChrome = args.includes("--chromium");
    let isFirefox = args.includes("--firefox");
    if (!isChrome && !isFirefox) {
        isChrome = true;
        isFirefox = true;
    }

    const isWatch = args.includes("--watch");
    await deleteOldDir();

    let chromeBuild, firefoxBuild;
    if (isChrome) {
        chromeBuild = await runEsbuild({
            buildPath: `./${outdir}/chromium`,
            manifestPath: "src/manifest_chromium.json",
            watch: isWatch,
        });
        if (!isWatch) {
            zipFolder(`${outdir}/chromium`);
        }
    }
    if (isFirefox) {
        firefoxBuild = await runEsbuild({
            buildPath: `./${outdir}/firefox`,
            manifestPath: "src/manifest_firefox_v2.json",
            watch: isWatch,
        });
        if (!isWatch) {
            zipFolder(`${outdir}/firefox`);
        }
    }

    console.log("Build success");

    if (isWatch) {
        await Promise.all([chromeBuild?.watch(), firefoxBuild?.watch()]);
        console.log("Watching for changes...");
    }
}

build();
