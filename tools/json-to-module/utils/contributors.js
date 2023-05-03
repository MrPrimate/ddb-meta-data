// Add the contributors from a JSON file to the manifests

const { ArgumentParser } = require("argparse");
const fs = require("fs-extra");
const path = require("path");

const parser = new ArgumentParser({
    add_help: true,
    description: "D&D Beyond Contributors",
});
parser.add_argument("booksMetadataDirPath", { help: "Path to the books metadata directory" });
parser.add_argument("jsonPath", { help: "Path to the JSON file containing the contributors" });
const args = parser.parse_args();

(async () => {
    const books = await fs.readdir(args.booksMetadataDirPath);
    const json = await fs.readJSON(args.jsonPath);

    console.groupCollapsed(`Updating ${books.length} contributors`);
    for (const book of books) {
        const contributors = json[book] ?? [];

        const manifestPath = path.resolve(args.booksMetadataDirPath, book, "module.json");
        if (!(await fs.pathExists(manifestPath))) continue;
        const manifest = await fs.readJSON(manifestPath);

        const authors = {};
        for (let author of contributors) {
            if (typeof author === "string") {
                author = {
                    name: author.split("#")[0],
                    discord: author,
                };
            }
            authors[author.name] = author;
        }

        manifest.authors = [
            {
                name: "MrPrimate",
                email: "jack@mrprimate.co.uk",
                url: "https://mrprimate.co.uk",
                patreon: "https://www.patreon.com/MrPrimate",
                discord: "https://discord.gg/WzPuRuDJVP",
            },
            ...Object.values(authors),
            {
                name: "The Forge",
                url: "https://forge-vtt.com",
                email: "contact@forge-vtt.com",
                discord: "https://forge-vtt.com/discord",
                reddit: "https://www.reddit.com/r/ForgeVTT",
                twitter: "@ForgeVTT",
            },
        ];
        await fs.writeJSON(manifestPath, manifest, { spaces: "\t" });
        console.info(`Updated ${book} contributors`);
    }
    console.groupEnd();
})();
