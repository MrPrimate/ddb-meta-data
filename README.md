# DDB Meta Data

## What?

This repo contains meta data associated with the books on DDB.
It can be used to help align maps, place tokens and set up content that you have on DDB into Foundry Virtual tabletop.
This repo is intended to be used by other software products, such as [DDB Adventure Muncher](https://github.com/MrPrimate/ddb-adventure-muncher/).

## Current Scene Support

All books with Scenes should now have notes generated. Please highlight if you find missing Notes/Pins.

You can see the state of scene support at [this website](https://docs.ddb.mrprimate.co.uk/status.html).

If you wish to help improve the scene wall and lighting information, see the below section.

## Contribution

### Scene adjustments

* Scenes will export:
  * Links to places notes/pins
  * Information about tokens placed from the DDB Monster Compendium
  * Lights
  * Global illumination
  * Alignment and scaling
  * Walling and doors
  * Drawings
  * Stairways module settings (optional)
  * Perfect Vision settings on a scene (optional)
  * Dynamic Illumination settings on a scene (optional)

### How?

* You need to be using v2.1.11+ of ddb-importer.
* Open the Chrome Developer Console (F12) and run `game.settings.set("ddb-importer", "allow-scene-download", true)`
* Now when you right click on a scene navigation button you will get the option to download the associated data (DDB Scene Config).
* Fill out the form and upload the json file [here](https://forms.gle/NvyRWdUxi9Dho4As9)

### Stairways module

If you export scenes with stairways data included, that will be added in to the generated scenes.

### Missed parsing

If you find a missing scene, or something has not parsed right please let me know on Discord.

There are a number of handouts/images that are numbered Handout 1/2/3/etc.
If you have a good name for one of these handouts please make a note of it.
I will be starting to collect this information in a shared google sheet in the coming weeks.

## Flags

### Actors

* `monsterId` - The ID of the associated DDB monster

### Tables

* `ddbId` - Unique ID used by MrPrimate's importer (often the row number in the sqlite database)

* `cobaltId` - ID of a parent section

* `slug` - The table's slug

* `tagIdFirst` - The ID of the start tag

* `contentChunkId` - The table's content chunk ID

* `sceneName` - Name of the corresponding scene

### Scenes

* `bookCode` - e.g. `lmop`, `cos`

* `ddbId` - Unique ID used by MrPrimate's importer (often the row number in the sqlite database)

* `cobaltId` - ID of a parent section

* `parentId` - ID for the parent section

* `contentChunkId` - The scene's content chunk ID

* `foundryVersion` - Compatible FVTT version

* `versions` - Versioning data

  * `ddbMetaData` - Versioning data for the metadata specifically

    * `name` - Name of scene

    * `bookCode` - e.g. `lmop`, `cos`

    * `contentChunkId` - The map's content chunk ID

    * `lastUpdate` - Last metadata version the scene was updated in

    * `notes` - Version of notes

    * `tokens` - Version of tokens

    * `walls` - Version of walls

    * `lights` - Version of lights

    * `drawings` - Version of drawings

    * `foundry` - Compatible FVTT version

* `noteInfos` - Optionally contains data used for splitting scene notes

  * `ddbId` - Unique ID used by MrPrimate's importer (often the row number in the sqlite database)

  * `cobaltId` - ID of a parent section

  * `parentId` - ID for the parent section

  * `splitTag` - Tag to split on

  * `slug` - Slug of the scene note

  * `tagIdFirst` - The ID of the start tag

  * `contentChunkIdStart`- Content chunk ID of the tag to start parsing at

  * `tagIdLast` - The ID of the stop tag

  * `contentChunkIdStop` - Content chunk ID of the tag to stop parsing at

  * `sceneName` - Name of the scene

## Fan Content

The scene adjustments and walling data is released as unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
