const { copyDirectory } = require('../tasks/per-fs');
const constants = require('../tasks/constants')
const fse = require('fs-extra');

function setup(projectFolder) {
    // Copy Peregrine over
    if(!fse.pathExistsSync(projectFolder)) {
        console.log('Project Folder: ' + projectFolder + ' does not exist -> fail');
        return '!!Non-Existing-Project-Folder!!';
    }
    let sourceFolder = projectFolder + constants.SLASH + constants.PEREGRINE_SOURCE_ROOT;
    let targetFolder = projectFolder + constants.SLASH + constants.OUTPUT_ROOT;
    copyDirectory(sourceFolder, targetFolder, false);
    return targetFolder;
}

module.exports = {
    /**
     * Sets Up the Conversion
     * @param {string} projectFolder - this project folder
     * @return Any feedback or an empty string if everything went through alright
     */
    setup(projectFolder) {
        return setup(projectFolder);
    }
}
