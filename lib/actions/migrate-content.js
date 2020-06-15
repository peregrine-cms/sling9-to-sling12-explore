const constants = require('../tasks/constants')
const fse = require('fs-extra');

const { getContentFolder, getResourcesFolder, copyDirectory } = require('../tasks/per-fs');
const { copyContent, convertXML } = require('../tasks/peregrine');

function migrateContent(moduleFolder, sourceFolderName, targetFolderName) {
    // Check the Module Folder
    if(!fse.pathExistsSync(moduleFolder)) {
        console.log('Module Folder: ' + moduleFolder + ' does not exist -> fail');
        return '!!Non-Existing-Module-Folder!!';
    }
    // Get Source and Target Module folder
    let sourceFolder = moduleFolder + constants.SLASH + sourceFolderName;
    if(!fse.pathExistsSync(sourceFolder)) {
        console.log('Source Folder: ' + sourceFolder + ' does not exist -> fail');
        return '!!Non-Existing-Module-Source-Folder!!';
    }
    let targetFolder = moduleFolder + constants.SLASH + targetFolderName;
    if(!fse.pathExistsSync(targetFolder)) {
        console.log('Target Folder: ' + targetFolder + ' does not exist -> fail');
        return '!!Non-Existing-Module-Target-Folder!!';
    }
    // Copy the Content from ui.apps to core
    let slingContentFolder = copyContent(sourceFolder, targetFolder);
    // Convert .content.xml files to their JSon counterpart
    convertXML(slingContentFolder);

    return '';
}

module.exports = {
    /**
     * Does the Content Migration of a Module
     * @param {string} moduleFolder - this module folder
     * @param {string} sourceFolderName - name of the source folder (ui.apps or so)
     * @param {string} targetFolderName - name of the target folder (core or so)
     * @return Any feedback or an empty string if everything went through alright
     */
    migrateContent(moduleFolder, sourceFolderName, targetFolderName) {
        return migrateContent(moduleFolder, sourceFolderName, targetFolderName);
    }
}
