const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const userinteraction = require('./user-interaction')

const constants = require('../tasks/constants')

const myFilter = (src, dest) => {
    let basename = path.basename(src);
    if(basename === 'target') {
        return false;
    }
    return true;
}

function getFolder(startingFolder, subFolders) {
    var answer = startingFolder;
    for( let folder of subFolders) {
        answer = answer + "/" + folder;
        if(!fse.pathExistsSync(answer)) {
            console.log('Folder: ' + answer + ' does not exist -> fail');
            return '';
        }
    }
    return answer;
}

function getContentFolder(moduleFolder) {
    if(!fse.pathExistsSync(moduleFolder)) {
        console.log('Module Folder: ' + moduleFolder + ' does not exist -> fail');
        return '!!Non-Existing-Module-Folder!!';
    }
    var contentFolder = getFolder(moduleFolder, ["src", "main", "content", "jcr_root"]);
    if(contentFolder === '') {
        return '!!Non-Existing-Sub-Module-Folder!!';
    }
    return contentFolder;
}

function getResourcesFolder(moduleFolder) {
    if(!fse.pathExistsSync(moduleFolder)) {
        console.log('Module Folder: ' + moduleFolder + ' does not exist -> fail');
        return '!!Non-Existing-Module-Folder!!';
    }
    var resourceFolder = getFolder(moduleFolder, ["src", "main", "resources"]);
    if(resourceFolder === '') {
        return '!!Non-Existing-Sub-Module-Folder!!';
    }
    return resourceFolder;
}

function copyDirectory(srcFolder, destFolder, overwriteFiles) {
    console.log('Copy: ' + srcFolder + ' to folder: ' + destFolder);
    if(!fse.pathExistsSync(srcFolder)) {
        console.log('Source Folder: ' + srcFolder + ' does not exist -> fail');
        return '!!Non-Existing-Source-Folder!!';
    }
    console.log("Destination Folder: " + path.resolve(path.dirname(destFolder)));
    let parentDestFolder = path.resolve(path.dirname(destFolder));
    console.log("Parent Destination Folder: " + parentDestFolder);
    if(!fse.pathExistsSync(parentDestFolder)) {
        console.log('Destination Parent Folder: ' + parentDestFolder + ' does not exist -> fail');
        return '!!Non-Existing-Destination-Folder!!';
    }
    if(fse.pathExistsSync(destFolder) && !overwriteFiles) {
        console.log('Peregrine Destination Folder: ' + destFolder + ' exists');
        var answer = userinteraction.ask("Peregrine Copy already exists", ["ok", "exit"]);
        if(answer === 'exit') {
            return '!!Already-Existing-Peregrine-Destination-Folder!!';
        } else if(answer === 'ok') {
            // User is fine with it so return w/o a copy
            return '';
        }
// Does not work as of now (4.2.0)
//        fs.rmdirSync(destFolder, { recursive: true });
    } else {
        console.log('Create Destination Folder: ' + destFolder);
        fse.ensureDirSync(destFolder);
    }
    console.log('Execute the Copy');
    fse.copySync(srcFolder, destFolder, { filter: myFilter, overwrite: overwriteFiles } );
    return '';
}

module.exports = {
    /**
     * Copies a source folder to a given destination folder as sub folder
     * @param {string} srcFolder - the source folder which must exist
     * @param {string} destFolder - the target folder that is created by the copy which may exist
     * @param {boolean} overwriteFiles - if true an existing files will be overwritten if they exist
     * @return Any feedback or an empty string if everything went through alright
     */
    copyDirectory(srcFolder, destFolder, overwriteFiles) {
        return copyDirectory(srcFolder, destFolder, overwriteFiles);
    },

    /**
     * Obtains the Content Folder of the Module
     * @param {string} moduleFolder - Folder of the Module which must exist
     * @returns {string} Content Folder if it could be found
     */
    getContentFolder(moduleFolder) {
        return getContentFolder(moduleFolder);
    },

    /**
     * Obtains the Resources Folder of the Module
     * @param {string} moduleFolder - Folder of the Module which must exist
     * @returns {string} Content Folder if it could be found
     */
    getResourcesFolder(moduleFolder) {
        return getResourcesFolder(moduleFolder);
    }
}