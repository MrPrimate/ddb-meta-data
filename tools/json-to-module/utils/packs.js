// Updates packs in all manifests

const fs = require("fs-extra");
const path = require("path");

const modulesPath = path.resolve(__dirname, "../../../modules");

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
    const books = await fs.readdir(modulesPath);

    console.groupCollapsed(`Updating ${books.length} packs`);
    for (const book of books) {
        const manifestPath = path.resolve(modulesPath, book, "module.json");
        if (!(await fs.pathExists(manifestPath))) continue;
        const manifest = await fs.readJSON(manifestPath);

        const dbPath = path.resolve(modulesPath, book, "packs");
        if (!(await fs.pathExists(dbPath))) continue;
        const dbFiles = await fs.readdir(dbPath);

        const packs = dbFiles
            .map(file => {
                const name = file.split(".")[0];
                if (!TYPES.get(name)) return;
                return {
                    name: name,
                    label:
                        manifest.packs.find(p => p.name === name)?.label ?? `${book.toUpperCase()} ${TYPES.get(name)}s`,
                    path: `packs/${file}`,
                    entity: TYPES.get(name),
                    type: TYPES.get(name),
                    system: "dnd5e",
                };
            })
            .filter(Boolean);

        manifest.packs = packs;
        await fs.writeJSON(manifestPath, manifest, { spaces: "\t" });
        console.info(`Updated ${book} packs`);
    }
    console.groupEnd();
})();
