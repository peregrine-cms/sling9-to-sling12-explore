const { copyDirectory } = require('../tasks/per-fs');
const constants = require('../tasks/constants')
const fse = require('fs-extra');

function setup(projectFolder) {
    // Copy Peregrine over
    if(!fse.pathExistsSync(projectFolder)) {
        throw new Error('Project Folder: ' + projectFolder + ' does not exist')
    }
    let sourceFolder = projectFolder + constants.SLASH + constants.PEREGRINE_SOURCE_ROOT;
    let targetFolder = projectFolder + constants.SLASH + constants.OUTPUT_ROOT;
    return copyDirectory(sourceFolder, targetFolder, false);
}

module.exports = {
    /**
     * Sets Up the Conversion
     * @param {string} projectFolder - this project folder
     * @return Any feedback or an empty string if everything went through alright
     * @throws If the Project Folder does not exist, the copy failed or the user exited because of duplicate
     */
    setup(projectFolder) {
        return setup(projectFolder);
    }
}
