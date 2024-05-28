const fs = require("fs-extra");
const path = require("path");
const Datastore = require("nedb");
const { ArgumentParser } = require("argparse");
const utils = require("./utils");

async function main() {
    const parser = new ArgumentParser({
        add_help: true,
        description: "D&D Beyond Meta Data",
    });

    parser.add_argument("-a", "--book", { help: "Book abbreviation" });
    parser.add_argument("-m", "--manifest", { help: "Path to the manifest JSON file" });
    parser.add_argument("-c", "--converted", { help: "Path to the converted book JSON file (for module.json avatar)" });
    parser.add_argument("-o", "--output", {
        help: "Output directory",
        default: path.resolve(__dirname, "../../modules"),
    });
    parser.add_argument("--overwrite", {
        help: "Overwrite output folder if it exists",
        action: "store_true",
        default: false,
    });
    parser.add_argument("-f", "--force", {
        help: "Force overwrite of existing files (README, Manifest)",
        action: "store_true",
        default: false,
    });
    parser.add_argument("action", { help: "Action to perform: assemble" });
    const args = parser.parse_args();

    if (!["assemble"].includes(args.action)) {
        console.error("Error", "Action invalid. Accepts: assemble");
        return process.exit(-1);
    }

    try {
        await assemble(args);
    } catch (err) {
        console.error("Error", "Error assembling meta data", err);
        return process.exit(-1);
    }
}

/**
 * Provides an interface for NeDB datastores
 */
class DatabaseInterface {
    /**
     * Create and load a new database file
     * @param {string} name - Name of the database
     * @param {object} args - Command line arguments
     */
    constructor(name, args) {
        this.name = name;
        this.path = path.resolve(args.output, args.book, "packs", `${this.name}.db`);
        if (fs.existsSync(this.path)) fs.rm(this.path); // Clear existing database
        this.db = new Datastore({ filename: this.path, autoload: true });
    }

    /**
     * Save documents to the database
     * @param {object[]} docs - An array of documents to insert
     * @returns {Promise<object>} - A promise that resolves with the inserted documents
     */
    async save(docs) {
        const outcomes = await Promise.allSettled(
            docs.map(
                doc =>
                    new Promise((resolve, reject) =>
                        this.db.insert(doc, (err, newDoc) => {
                            if (err) {
                                console.error("Error", `Error inserting document`, err);
                                reject(err);
                            } else {
                                console.info(`Saved "${newDoc.name}" to ${this.name} as ${newDoc._id}`);
                                resolve(newDoc);
                            }
                        })
                    )
            )
        );
        outcomes.filter(outcome => outcome.fulfilled).map(outcome => console.error("Error", outcome.reason));
        this.db.persistence.compactDatafile();
        console.info(`Inserted ${this.name} and compacted database file`);
        return outcomes.map(outcome => outcome.value);
    }

    /**
     * Loads data from an existing database file
     * @param {string} path - Path to the file to load
     * @returns {Promise<object[]>} - Promise that resolves with an array of documents
     */
    static async load(path) {
        return new Promise((resolve, reject) => {
            new Datastore({ filename: path, autoload: true }).find({}, (err, docs) => {
                if (err) {
                    console.error("Error", `Error loading database`, err);
                    reject(err);
                } else {
                    resolve(docs);
                }
            });
        });
    }
}

/**
 * Assembles meta data into a FVTT database file
 * @param {object} args
 */
async function assemble(args) {
    if (!args.overwrite && (await fs.pathExists(path.resolve(args.output, args.book)))) {
        console.info(`Skipping ${args.book} because it already exists`);
        return;
    } else if (args.force && (await fs.pathExists(path.resolve(args.output, args.book)))) {
        await fs.remove(path.resolve(args.output, args.book));
    }
    console.info(`Assembling meta data for ${args.book}`);
    console.time();

    await fs.ensureDir(path.resolve(args.output, args.book));

    const contentPath = path.resolve(__dirname, "../../content");

    const outcomes = await Promise.allSettled([
        assembleScenes(args, contentPath),
        assembleTables(args, contentPath),
        // assembleActors(args),
        // assembleItems(args),
        assembleManifest(args),
        assembleREADME(args),
    ]);
    outcomes.filter(outcome => outcome.status !== "fulfilled").map(outcome => console.error("Error", outcome.reason));
    console.info(`Done assembling meta data for ${args.book}`);
    console.timeEnd();
}

/**
 * Assembles the scenes
 * @param {object} args - Command line arguments
 * @param {string} contentPath - Path to content directory
 * @returns {Promise<object>} - Promise of the scenes
 */
async function assembleScenes(args, contentPath) {
    let scenes;

    try {
        const sceneInfoPath = path.resolve(contentPath, "scene_info", args.book);
        if (!fs.existsSync(sceneInfoPath)) {
            console.warn("Warning", `Scene info folder not found: ${sceneInfoPath}`);
            return;
        }
        const sceneFilePaths = (await fs.readdir(sceneInfoPath)).map(file => path.resolve(sceneInfoPath, file));
        const noteInfoPath = path.resolve(contentPath, "note_info", `${args.book}.json`);
        let noteInfo = fs.existsSync(noteInfoPath) ? await fs.readJSON(noteInfoPath) : [];
        scenes = await new DatabaseInterface("scenes", args).save(
            (
                await Promise.allSettled(
                    sceneFilePaths
                        .filter(file => fs.existsSync(file))
                        .map(async file => alterScene(await fs.readJSON(file), noteInfo, contentPath, args))
                )
            )
                .reduce((acc, cur) => {
                    if (cur.status === "fulfilled") acc.push(cur.value);
                    else console.error("Error", "Error processing scene file", cur.reason);

                    // Keep track of note info that wasn't inserted anywhere
                    if (cur.value.flags.ddb.noteInfos) {
                        const remainingNoteInfo = noteInfo.filter(
                            note => !cur.value.flags.ddb.noteInfos.some(n => n.slug === note.slug)
                        );
                        noteInfo = remainingNoteInfo;
                    }
                    return acc;
                }, [])
                .map(scene => {
                    const parentIds = [...new Set(scene.notes.map(n => n.flags.ddb.parentId))];
                    // Add note to scene if one of the scene's parentIds matches the note's parentId
                    const newNoteInfos = noteInfo.filter(note => parentIds.some(p => p === note.parentId));
                    if (newNoteInfos.length) {
                        scene.flags.ddb.noteInfos ??= [];
                        scene.flags.ddb.noteInfos.push(...newNoteInfos);
                        console.info(`Added \`note_info\` to flags for ${scene.name}`);
                    }
                    return scene;
                })
        );
        console.info(`Assembled ${sceneFilePaths.length} scenes for ${args.book}`);
    } catch (err) {
        console.error("Error", "Failed to assemble scenes", err);
    }

    // Copy tiles into the book's directory
    const srcTiles = path.resolve(contentPath, "assets", args.book);
    const destTiles = path.resolve(args.output, args.book, "tiles");
    if (await fs.pathExists(srcTiles)) {
        try {
            await fs.remove(destTiles).catch(() => null);
            await fs.ensureDir(destTiles);
            await fs.copy(srcTiles, destTiles);
            console.info(`Copied tiles for ${args.book}`);
        } catch (err) {
            console.error("Error", "Failed to copy tiles", err);
        }
    }

    return scenes;
}

/**
 * Assembles the tables
 * @param {object} args - Command line arguments
 * @param {string} contentPath - Path to content directory
 * @returns {Promise<object>} - Promise of the tables
 */
async function assembleTables(args, contentPath) {
    let tables;

    try {
        const tablesFilePath = path.resolve(contentPath, "table_info", `${args.book}.json`);
        if (!fs.existsSync(tablesFilePath)) {
            console.warn("Warning", `Table info file not found: ${tablesFilePath}`);
            return;
        }
        const tables = await new DatabaseInterface("tables", args).save(
            await alterTables(await fs.readJSON(tablesFilePath), args)
        );
        console.info(`Assembled tables for ${args.book}`);
    } catch (err) {
        console.error("Error", "Failed to assemble tables", err);
    }
    return tables;
}

/**
 * Assembles the manifest
 * @param {object} args - Command line arguments
 * @returns {Promise<object>} - Promise of the manifest
 */
async function assembleManifest(args) {
    const manifestPath = path.resolve(args.output, args.book, `module.json`);
    if (!args.force && fs.existsSync(manifestPath)) {
        console.info(`Skipping manifest for ${args.book} as it already exists`);
        return;
    }
    const json = (await fs.readJson(args.manifest)).find(m => m.DirectoryName === args.book);
    const manifest = {
        id: args.book,
        name: args.book,
        title: json.Title,
        description: json.ProductBlurb || json.Description,
        authors: [
            {
                name: "The Forge",
                url: "https://forge-vtt.com",
                email: "contact@forge-vtt.com",
                discord: "https://forge-vtt.com/discord",
                reddit: "https://www.reddit.com/r/ForgeVTT",
                twitter: "@ForgeVTT",
            },
        ],
        url: `https://www.dndbeyond.com/sources/${args.book}`,
        license: "",
        readme: "",
        bugs: "",
        changelog: "",
        flags: {},

        version: "0.0.0",
        compatibility: {
            minimum: "0.7.9",
            verified: "10",
        },
        minimumCoreVersion: "0.7.9",
        compatibleCoreVersion: "10",

        scripts: [],
        esmodules: [],
        styles: [],
        languages: [],
        packs: [],

        relationships: {
            systems: [
                {
                    id: "dnd5e",
                    type: "system",
                    manifest: "https://github.com/foundryvtt/dnd5e/releases/latest/download/system.json",
                    compatibility: {
                        verified: "2.0.3",
                    },
                },
            ],
        },
        system: ["dnd5e"],
        dependencies: [],
        socket: false,

        manifest: "",
        download: "",
        protected: false,

        manifestPlusVersion: "1.2.0",
    };
    if (args.converted) {
        const source = (await fs.readJson(args.converted))[0]
        if (source && source.Avatar) {
            manifest.media = [
                {
                    type: "cover",
                    url: `ddb://image/${args.book}/listing_images/${source.Avatar}`,
                },
            ];
        }
    }
    await fs.writeJSON(manifestPath, manifest, { spaces: "\t" });
    console.info(`Saved manifest file to ${manifestPath}`);
    return manifest;
}

/**
 * Assembles the README
 * @param {object} args - Command line arguments
 * @returns {Promise<object>} - Promise of the README
 */
async function assembleREADME(args) {
    const readmePath = path.resolve(args.output, args.book, "README.md");
    if (!args.force && fs.existsSync(readmePath)) {
        console.info(`Skipping README for ${args.book} as it already exists`);
        return;
    }
    const json = (await fs.readJson(args.manifest)).find(m => m.DirectoryName === args.book);
    const description = utils.htmlToMarkdown(json.ProductBlurb ?? "");
    const readme = `# ${json.Title}\n\n${description}\n\n## License\n\nThis data is release as Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC.\n`;
    await fs.writeFile(readmePath, readme);
    console.info(`Saved README file to ${readmePath}`);
    return readme;
}

/**
 * Alter scene
 * @param {object} scene - Scenes to alter
 * @param {object[]} noteInfo - Note info
 * @param {string} contentPath - Path to content directory
 * @param {object} args - Command line arguments
 * @returns {Promise<object>} - Promise of the altered scene
 */
async function alterScene(scene, noteInfo, contentPath, args) {
    console.groupCollapsed(`Altering scene ${scene.name}`);

    try {
        // Pull data from flags
        const flags =
            scene.flags.ddb ?? console.warn("Warning", `Scene ${scene.name} has no ddb meta data flags`) ?? {};
        let img = flags?.originalLink ?? console.warn("Warning", `No original image link found for ${scene.name}`);
        const [alternate] = flags?.alternateIds ?? []; // Doesn't handle multiple alternate ids, but that's never needed for now
        const tokens = flags?.tokens ?? console.warn("Warning", `Scene ${scene.name} has no tokens`) ?? [];
        const notes = flags?.notes ?? console.warn("Warning", `Scene ${scene.name} has no notes`) ?? [];
        const tiles = flags?.tiles ?? console.warn("Warning", `Scene ${scene.name} has no tiles`) ?? [];

        // Handle images which aren't in the DDB schema format
        if (img && !img.includes("ddb://")) {
            // Remove the leading `./`
            let normalized = path.posix.normalize(img);
            // Add the book name if it's not there
            if (!normalized.startsWith(args.book)) normalized = path.posix.join(args.book, normalized);
            // Convert to the DDB schema format
            img = `ddb://image/${normalized}`;
            console.info(`Using converted image URI for ${scene.name}`, img);
        }

        // Use alternate image if it's available
        if (alternate) {
            // Remove leading `assets/` from URI
            img = alternate.img.split("/").slice(1).join("/");
            // Convert image URI to the DDB schema format
            img = `ddb://image/${args.book}/${img}`;
            console.info(`Using alternate image for ${scene.name}`, img);
        }

        // Add note_info to the scene flags
        if (noteInfo) {
            const slugs = [...new Set(notes.map(n => n.flags.ddb.slug))];
            // Add note to scene if one of the scene's slugs matches the note's slug
            const noteInfos = noteInfo.filter(note => slugs.some(s => note.slug.includes(s)));
            if (noteInfos.length) {
                scene.flags.ddb.noteInfos = noteInfos;
                console.info(`Added \`note_info\` to flags for ${scene.name}`);
            }
        }

        // Use flags in the scene
        scene = Object.assign(scene, {
            img,
            tokens,
            notes,
            tiles,
        });
        console.info(`Used flags for ${scene.name}`);

        // Delete used flags
        delete flags.originalLink;
        delete flags.alternateIds;
        delete flags.tokens;
        delete flags.notes;
        delete flags.tiles;
        console.info(`Deleted used flags for ${scene.name}`);

        // Create a note at each position
        scene.notes = scene.notes.reduce((acc, note) => {
            acc.push(
                ...note.positions.map(position =>
                    Object.assign(note, {
                        x: position.x,
                        y: position.y,
                        _id: utils.randomId()
                    })
                )
            );
            delete note.positions;
            return acc;
        }, []);
        if (scene.notes.length) console.info(`Created notes for ${scene.name}`);

        if (scene.tiles.length) {
            // Rewrite tile links to use meta data schema
            scene.tiles.forEach(tile => {
                tile.img = tile.img?.replace(/^assets\//, `ddb-meta-data://${args.book}/tiles/`)
                if (!tile._id) {
                    tile._id = utils.randomId();
                }
            });
            console.info(`Rewrote tile links for ${scene.name}`);
        }
        // Ensure every scene embedded entity has an _id so it can migrate to leveldb (v11+) without issues
        // tiles and notes are already handled above
        const embeddedEntities = [/*"tiles", "notes", */"tokens", "lights", "templates", "sounds", "drawings", "walls"];
        for (const entity of embeddedEntities) {
            if (!scene[entity]) continue;
            for (const item of scene[entity]) {
                if (!item._id) {
                    item._id = utils.randomId();
                }
            }
        }

        console.groupEnd();
    } catch (err) {
        console.error("Error", `Error altering scene ${scene.name}`, err);
    }

    return scene;
}

/**
 * Alter tables
 * @param {object[]} tables - Tables to alter
 * @param {object} args - Command line arguments
 * @returns {Promise<object[]>} - Promise of the altered tables
 */
async function alterTables(tables, args) {
    const alteredTables = [];
    const folders = new Map();
    console.groupCollapsed(`Altering tables`);

    // Create folders
    try {
        const folderNames = [...new Set(tables.map(table => table.folderName).filter(Boolean))];
        for (const folderName of folderNames) {
            folders.set(folderName, await createFolder(folderName, "RollTable", args));
        }
        console.info(`Created ${folders.size} folders`);
    } catch (err) {
        console.error("Error", `Error creating folders`, err);
    }

    // Create tables
    try {
        tables.forEach((table, i) => alteredTables.push({
            name: table.tableName,
            img: "",
            results: [],
            replacement: true,
            displayRoll: true,
            folder: folders.get(table.folderName)?._id ?? null,
            sort: i * 1000,
            permission: {},
            flags: {
                ddb: Object.fromEntries(
                    Object.entries(table).filter(([key]) => !["tableName", "folderName"].includes(key))
                ),
            },
        }));
        console.info(`Created ${alteredTables.length} tables`);
    } catch (err) {
        console.error("Error", `Error creating tables`, err);
    }

    console.groupEnd();
    return alteredTables;
}

/**
 * Create folders
 * @param {string} name - Name of the folder
 * @param {string} type - Document type
 * @param {object} args - Command line arguments
 * @returns {Promise<object>} - Created folder document
 */
async function createFolder(name, type, args) {
    console.info(`Creating ${type} folder ${name}`);
    return (
        await new DatabaseInterface("folders", args).save([
            {
                name,
                type,
                parent: null,
                sorting: "a",
                sort: 0,
                color: null,
                flags: {},
            },
        ])
    )[0];
}

module.exports = main;
