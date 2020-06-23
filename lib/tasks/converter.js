const fse = require('fs-extra');

const { migrateContent, addBundleContentToPOM, removeModule } = require('./migrate-content');
const { SLASH } = require('./constants');

function convertContentPackageToBundleContent(projectFolder, modulePath) {
    if(!fse.pathExistsSync(projectFolder)) {
        throw new Error('Project Folder: ' + projectFolder + ' does not exist')
    }
    let baseModuleFolder = projectFolder + SLASH + modulePath;
    let coreModuleFolder = migrateContent(baseModuleFolder, 'ui.apps', 'core');
    addBundleContentToPOM(coreModuleFolder);
    removeModule(baseModuleFolder, 'ui.apps');
}

module.exports = {
    /**
     * Converts a Content Package to a Bundle Content
     * @param projectFolder {string} - Folder Path of the Project
     * @param modulePath {string} - Relative Path to the Module
     * @throws If the Base Module Folder does not exist
     */
    convertContentPackageToBundleContent(projectFolder, modulePath) {
        convertContentPackageToBundleContent(projectFolder, modulePath);
    }
}