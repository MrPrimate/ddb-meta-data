const { JSDOM } = require("jsdom");
const showdown = require("showdown");

module.exports = {
    /**
     * Clean up an HTML document by removing all attributes
     * @param {Document} document
     * @param {Window} window
     */
    removeAttributes(document, window) {
        const treeWalker = document.createNodeIterator(document.body, window.NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = treeWalker.nextNode())) {
            for (const attribute of node.getAttributeNames()) {
                node.removeAttribute(attribute);
            }
        }
    },

    /**
     * Converts an HTML string to markdown without any styling
     * @param {string} string
     * @returns {string}
     */
    htmlToMarkdown(string) {
        const { window }  = new JSDOM(string);
        const { document } = window;
        this.removeAttributes(document, window);
        const converter = new showdown.Converter();
        converter.setFlavor("github");
        return converter.makeMarkdown(document.body.innerHTML, document);
    },
};
