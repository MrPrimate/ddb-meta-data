// Updates packs in all manifests

const fs = require("fs-extra");
const path = require("path");

const TYPES = new Map([
    ["actors", "Actor"],
    ["cards", "Cards"],
    ["items", "Item"],
    ["journal", "JournalEntry"],
    ["macros", "Macro"],
    ["playlists", "Playlist"],
    ["tables", "RollTable"],
    ["scenes", "Scene"],
    ["adventures", "Adventure"],
]);

(async () => {
    const books = await fs.readdir(path.resolve("../../modules"));

    for (const book of books) {
        const manifestPath = path.resolve("../../modules", book, "module.json");
        if (!(await fs.pathExists(manifestPath))) continue;
        const manifest = await fs.readJSON(manifestPath);
        
        const dbPath = path.resolve("../../modules", book, "packs");
        if (!(await fs.pathExists(dbPath))) continue;
        const dbFiles = await fs.readdir(dbPath);

        const packs = dbFiles
            .map(file => {
                const name = file.split(".")[0];
                if (!TYPES.get(name)) return;
                return {
                    name: name,
                    label: `${book.toUpperCase()} ${TYPES.get(name)}s`,
                    path: `packs/${file}`,
                    entity: TYPES.get(name),
                    type: TYPES.get(name),
                    system: "dnd5e",
                };
            })
            .filter(Boolean);

        manifest.packs = packs;
        await fs.writeJSON(manifestPath, manifest, { spaces: "\t" });
        console.info(`Updated ${book}`);
    }
})();
