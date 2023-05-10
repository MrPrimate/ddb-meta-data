// Bootstrap the metadata for a scene that doesn't yet have any

const { ArgumentParser } = require("argparse");
const fs = require("fs-extra");
const path = require("path");
const { imageSize } = require("image-size");
const { JSDOM } = require("jsdom");
const { window } = new JSDOM("");

const parser = new ArgumentParser({
    add_help: true,
    description: "D&D Beyond Meta Scene Bootstrap",
});
parser.add_argument("-a", "--book", { help: "Book abbreviation" });
parser.add_argument("-c", "--converted", { help: "Converted book path (output of `dndbconverter`)" });
parser.add_argument("-m", "--metadata", { help: "Metadata path" });
const args = parser.parse_args();
const { book } = args;

if (!args.book) throw new Error("No book specified");
if (!args.converted) throw new Error("No converted path specified");
if (!args.metadata) throw new Error("No metadata path specified");

(async () => {
    const [{ contents }] = await fs.readJSON(`${args.converted}/${book}/${book}.json`);
    if (!contents) throw new Error("No contents found");

    await fs.ensureDir(`${args.metadata}/content/scene_info/${book}`);
    const sceneInfo = await fs.readdir(`${args.metadata}/content/scene_info/${book}`);
    const currentScenes = await Promise.all(
        sceneInfo.map(file => {
            return fs.readJSON(`${args.metadata}/content/scene_info/${book}/${file}`);
        })
    );
    const newScenes = [];

    let heading,
        sort = Math.max(currentScenes.map(s => s.sort)),
        navOrder = Math.max(currentScenes.map(s => s.navOrder));

    pages: for (const page of contents) {
        try {
            const div = window.document.createElement("div");
            div.innerHTML = page.RenderedHtml;
            const treeWalker = window.document.createTreeWalker(div, window.NodeFilter.SHOW_ELEMENT);
            let node;
            while ((node = treeWalker.nextNode())) {
                if (node.nodeName === "H1") heading = node.textContent;
                const name = heading ?? page.Title;

                if ([...currentScenes, ...newScenes].find(s => [s.name, s.navName].includes(name))) continue pages;
                if (node.title === "View Player Version") {
                    const imagePath = path.join(args.converted, book, node.href.slice(`ddb://image/${book}`.length));
                    if (!node.href.startsWith("ddb://image/") || !fs.pathExists(imagePath)) {
                        console.warn(`No image for ${name}`);
                        continue;
                    }

                    const { width, height } = imageSize(imagePath);

                    newScenes.push({
                        name,
                        img: node.href,
                        navName: name,
                        flags: {
                            ddb: {
                                bookCode: book,
                                ddbId: 10000 + page.ID,
                                parentId: page.ParentID,
                                contentChunkId: node.dataset.contentChunkId,
                            },
                        },
                        width,
                        height,
                        sort: (sort += 1000),
                        navOrder: (navOrder += 1),
                        thumb: node.href,
                    });
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    await Promise.all(
        newScenes.map(scene => {
            const { ddbId, parentId, contentChunkId } = scene.flags.ddb;
            const basename = [book, ddbId, parentId, contentChunkId, "scene"].join("-");
            return fs.writeJSON(
                `${args.metadata}/content/scene_info/${book}/${basename}.json`,
                scene,
                { spaces: 4 }
            );
        })
    );

    console.info(`Bootstrapped ${newScenes.length} scenes`);
})();
