const fse = require('fs-extra');
const fs = require('fs');
const xml2js = require('xml2js');

const { migrateContent, adjustCorePOM, adjustPOMModules } = require('./migrate-content');
const { SLASH } = require('./constants');
const pomLib = require('./pom');
const util = require('./util');
const perfs = require('./per-fs');

const parser = new xml2js.Parser();

function convertContentPackageToBundleContent(projectFolder, module) {
    if(!fse.pathExistsSync(projectFolder)) {
        throw new Error('Project Folder: ' + projectFolder + ' does not exist')
    }
    let baseModuleFolder = projectFolder + SLASH + module.parent + SLASH + module.name;
    let coreModuleFolder = migrateContent(baseModuleFolder, module.ui, module.core);
    let uiModuleFolder = baseModuleFolder + SLASH + module.ui;
    let copyInstructions = module.pomCopy;
    adjustCorePOM(coreModuleFolder, uiModuleFolder, copyInstructions);
    adjustPOMModules(baseModuleFolder, undefined, [module.ui]);
}

function adjustFileContent(filePath, adjustInstructions) {
    if(!fse.pathExistsSync(filePath)) {
        throw new Error('File: ' + filePath + ' does not exist');
    }
    perfs.prepareFileForChange(filePath);
    fs.readFile(filePath, {encoding: 'utf8'}, function(err, data) {
        if(err) {
            throw new Error('Loading File failed: ' + filePath + '. Error: ' + err);
        }
        console.log('File Content: ' + data);
        let answer = data;
        for(let adjustInstruction of adjustInstructions) {
            if(adjustInstruction.type === 'raw') {
                let search = adjustInstruction.search;
                if(search === undefined) {
                    throw new Error('Search is not defined');
                }
                let replace = adjustInstruction.replace;
                if(replace === undefined) {
                    throw new Error('Replace is not defined');
                }
                answer = util.searchAndReplace(answer, search, replace, false);
            }
        }
        fs.writeFileSync(filePath, answer, 'utf8');
    });
}

module.exports = {
    /**
     * Converts a Content Package to a Bundle Content
     * @param projectFolder {string} - Folder Path of the Project
     * @param modulePath {object} - Object defining the module (parent, name, core)
     * @throws If the Base Module Folder does not exist
     */
    convertContentPackageToBundleContent(projectFolder, module) {
        convertContentPackageToBundleContent(projectFolder, module);
    },

    /**
     * Adjust the content of a file with the instructions given
     * @param filePath {string} - Path to the file
     * @param adjustInstructions {array} - An array with objects providing 'type' which can be 'raw' (no format), 'search'
     *                                     the text to look for, 'replace' the text that replaces the search text wherever
     *                                     found
     */
    adjustFileContent(filePath, adjustInstructions) {
        adjustFileContent(filePath, adjustInstructions);
    }
}