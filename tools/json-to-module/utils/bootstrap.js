// Bootstrap the metadata for a scene that doesn't yet have any

const { ArgumentParser } = require("argparse");
const fs = require("fs-extra");
const path = require("path");
const Datastore = require("nedb");
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

(async () => {
    const [json] = await fs.readJSON(`${args.converted}/${book}.json`);
    const { contents } = json;

    const db = new Datastore({ filename: `${args.metadata}/packs/scenes.db`, autoload: true });
    const scenes = await new Promise((resolve, reject) =>
        db.find({}, (err, docs) => {
            if (err) reject(err);
            else resolve(docs);
        })
    );

    let heading,
        sort = Math.max(scenes.map(s => s.sort)),
        navOrder = Math.max(scenes.map(s => s.navOrder));

    pages: for (const page of contents) {
        try {
            const div = window.document.createElement("div");
            div.innerHTML = page.RenderedHtml;
            const treeWalker = window.document.createTreeWalker(div, window.NodeFilter.SHOW_ELEMENT);
            let node;
            while ((node = treeWalker.nextNode())) {
                if (node.nodeName === "H1") heading = node.textContent;
                const name = heading ?? page.Title;

                if (scenes.find(s => [s.name, s.navName].includes(name))) continue pages;
                if (node.title === "View Player Version") {
                    const imagePath = path.join(args.converted, node.href.slice(`ddb://image/${book}`.length));
                    if (!node.href.startsWith("ddb://image/") || !fs.pathExists(imagePath)) {
                        console.warn(`No image for ${name}`);
                        continue;
                    }

                    const { width, height } = imageSize(imagePath);

                    db.insert({
                        name,
                        img: node.href,
                        navName: name,
                        flags: {
                            ddb: {
                                bookCode: book,
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

    db.count({}, (_err, count) => {
        console.info(`Bootstrapped ${count - scenes.length} scenes`);
    });

    if ((await fs.readFile(`${args.metadata}/packs/scenes.db`, "utf8")).trim().length === 0) {
        await fs.remove(`${args.metadata}/packs/scenes.db`);
        console.info("Removed empty scenes.db");
    }
})();
