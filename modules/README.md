# DDB Meta Data Modules

## What is it?

The DDB Meta Data modules are Foundry VTT modules containing the appropriate metadata in usable compendium packs.
The scenes data in the packs will match the data in the json files in the `content/` folder

## Why?

The purpose of using modules is to allow us to expand the metadata with more options, such as adding custom roll tables or journal entries or anything else that could be useful for an adventure which isn't necessarily able to be generated automatically from DDB content.
It also allows us to better organize the modules with the `module.json` containing any potential dependencies that a scene might require, include the contributors in the authors, provide a readable adventure description, etc...
This would also allow a user to use these modules directly to access the scene information and replace the image urls manually if they do not want to use one of the automated tools.

## How to generate?

In order to generate the modules, you need to have the DDB manifest downloaded, which you can get from <https://dndbeyond.com/mobile/api/v6/download-manifest>
Once you do, extract the manifest.zip file and you'll find the `manifest.json` instead, which is the file that we need.
Call `node tools/json-to-module.json assemble -a bookId -m manifest.json` where the `-a` option takes the name of the book (`cos` for "Curse of Strahd" for example, `br` for "Basic Rules", etc...)

If the module already exists and you want to update its content (because the json files have been updated in the `content` folder), rerun the same command, providing the `--overwrite` argument to it.

You can then run the following commands to modify the `module.json` in order to:
- Set the `authors` field to match the contributors to the adventure
- Set the description of the module
- Add the created compendium packs
```
node tools/json-to-module/utils/contributors.js modules content/contributors.json
node tools/json-to-module/utils/description.js modules
node tools/json-to-module/utils/packs.js
```
