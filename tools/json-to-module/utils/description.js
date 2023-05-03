// Pulls description from README and adds it to the manifest

const { ArgumentParser } = require("argparse");
const fs = require("fs-extra");
const path = require("path");
const showdown = require("showdown");
const converter = new showdown.Converter({
    omitExtraWLInCodeBlocks: true,
    noHeaderId: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tables: true,
    tasklists: true,
    smartIndentationFix: true,
    simpleLineBreaks: true,
    openLinksInNewWindow: true,
    underline: true,
});

const parser = new ArgumentParser({
    add_help: true,
    description: "D&D Beyond Description Update",
});
parser.add_argument("booksMetadataDirPath", { help: "Path to the books metadata directory" });
const args = parser.parse_args();

(async () => {
    const books = await fs.readdir(args.booksMetadataDirPath);

    console.groupCollapsed(`Updating ${books.length} descriptions`);
    for (const book of books) {
        const manifestPath = path.resolve(args.booksMetadataDirPath, book, "module.json");
        const readmePath = path.resolve(args.booksMetadataDirPath, book, "README.md");
        if (!(await fs.pathExists(manifestPath)) || !(await fs.pathExists(manifestPath))) continue;

        // Read manifest and README
        const manifest = await fs.readJSON(manifestPath);
        const readme = await fs.readFile(readmePath, "utf8");

        // Update manifest
        const description = readme.split("\n## License\n")[0].replace(/^[^\n]+\n\n/, "");
        manifest.description = converter.makeHtml(description);
        await fs.writeJSON(manifestPath, manifest, { spaces: "\t" });

        console.info(`Updated ${book}'s description`);
    }
    console.groupEnd();
})();
