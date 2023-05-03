// Download and copy assets for a book

const { ArgumentParser } = require("argparse");
const fs = require("fs-extra");
const path = require("path");
const https = require("https");

const parser = new ArgumentParser({
    add_help: true,
    description: "D&D Beyond Assets Downloader",
});
parser.add_argument("bookDir", { help: "Converted book directory" });
parser.add_argument("assetsDir", { help: "Assets directory" });
parser.add_argument("metadataAssetsDir", { help: "Metadata assets directory" });
const args = parser.parse_args();

downloadAssets(args.bookDir, args.assetsDir, args.metadataAssetsDir);

const utils = {
    async downloadUrl(url, destination) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destination);
            https.get(url, response => {
                response.pipe(file);
                file.on("finish", () => {
                    console.info(`Downloaded ${url} to ${destination}`);
                    file.close(() => resolve(true));
                }).on("error", reject);
            });
        });
    },
};

async function downloadAssets(bookDir, assetsDir, metadataAssetsDir) {
    console.groupCollapsed("Downloading assets");
    const filesTxt = path.resolve(bookDir, "files.txt");
    if (!(await fs.pathExists(filesTxt))) return;
    const filesJson = await fs.readJSON(filesTxt).catch(err => ({}));
    const files = filesJson && filesJson.files;
    if (!files) return;
    for (const asset of files) {
        // Same remote URL could point to multiple local files, let's download only once in that case
        const firstFilename = asset.LocalUrl[0];
        const downloadPath = path.join(assetsDir, firstFilename);
        if (!(await fs.pathExists(downloadPath))) {
            await fs.ensureDir(path.dirname(downloadPath));
            const success = await utils.downloadUrl(asset.RemoteUrl, downloadPath);
            if (!success) continue;
        }
        for (const localFile of asset.LocalUrl) {
            const local = path.join(assetsDir, localFile);
            const destination = path.join(bookDir, localFile);
            if (localFile !== firstFilename) {
                await fs.copy(downloadPath, local);
            }
            await fs.ensureDir(path.dirname(destination));
            await fs.copy(local, destination);
        }
    }
    console.info(`Downloaded assets to ${assetsDir}`);

    if (await fs.pathExists(metadataAssetsDir)) {
        const destination = path.resolve(assetsDir, "assets");
        await fs.ensureDir(destination);
        await fs.copy(metadataAssetsDir, path.resolve(assetsDir, "assets"));
        console.info(`Copied metadata assets to ${destination}`);
    }
    console.groupEnd();
}
