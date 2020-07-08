const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const userinteraction = require('./user-interaction')
var shell = require('shelljs');

const constants = require('../tasks/constants')

function getFolder(startingFolder, subFolders) {
    let answer = startingFolder;
    for(let folder of subFolders) {
        answer = answer + "/" + folder;
        if(!fse.pathExistsSync(answer)) {
            console.log('Folder: ' + answer + ' does not exist -> fail');
            return undefined;
        }
    }
    return answer;
}

function getContentFolder(moduleFolder) {
    if(!fse.pathExistsSync(moduleFolder)) {
        throw new Error('Module Folder: ' + moduleFolder + ' does not exist');
    }
    var contentFolder = getFolder(moduleFolder, ["src", "main", "content", "jcr_root"]);
    if(contentFolder === undefined) {
        console.log('Warning: Content Folder does not exist');
    }
    return contentFolder;
}

function getResourcesFolder(moduleFolder, doCreate) {
    if(!fse.pathExistsSync(moduleFolder)) {
        throw new Error('Module Folder: ' + moduleFolder + ' does not exist');
    }
    var resourceFolder = getFolder(moduleFolder, ["src", "main", "resources"]);
    if(resourceFolder === undefined) {
        if(doCreate) {
            fse.ensureDirSync(moduleFolder + '/src/main/resources');
            resourceFolder = getFolder(moduleFolder, ["src", "main", "resources"]);
        } else {
            throw new Error('Resource Folder does not exist');
        }
    }
    return resourceFolder;
}

function getSlingContentFolder(moduleFolder) {
    let resourceFolder = getResourcesFolder(moduleFolder, false);
    return resourceFolder + constants.SLASH + constants.SLING_CONTENT;
}

function copyDirectory(srcFolder, destFolder, overwriteFiles) {
    console.log('Copy: ' + srcFolder + ' to folder: ' + destFolder);
    if(!fse.pathExistsSync(srcFolder)) {
        throw new Error('Source Folder: ' + srcFolder + ' does not exist');
    }
    let parentDestFolder = path.resolve(path.dirname(destFolder));
    console.log('Destination Folder: ' + parentDestFolder);
    if(!fse.pathExistsSync(parentDestFolder)) {
        throw new Error('Parent Destination Folder: ' + parentDestFolder + ' does not exist');
    }
    if(fse.pathExistsSync(destFolder)) {
        if(!overwriteFiles) {
            console.log('Peregrine Destination Folder: ' + destFolder + ' exists');
            let answer = userinteraction.ask("Peregrine Copy already exists", ["[p]roceed", "[d]elete", "[e]xit"]);
            if (answer === 'e' || answer === 'exit') {
                throw new Error('User decided to exit script');
            } else if (answer === 'p' || answer === 'proceed') {
                // User is fine with it so return w/o a copy
                console.log('No Deletion -> just proceed');
                return destFolder;
            }
        }
        console.log('Delete existing Copy');
        shell.rm("-rf", destFolder + "/*");
        console.log('Delete done');
    } else {
        console.log('Create Destination Folder: ' + destFolder);
        fse.ensureDirSync(destFolder);
        console.log('Create Destination Folder done');
    }
    console.log('Copy Peregrine from Source');
    shell.cp('-R', srcFolder + "/*", destFolder);
    console.log('Copy Peregrine done');

    return destFolder;
}

function listFileInFolder(folder, recursively, filter) {
    console.log('List File and Folders, folder: ' + folder + ', recursively: ' + recursively);
    if(!fse.pathExistsSync(folder)) {
        throw new Error('Folder: ' + folder + ' does not exist');
    }
    let answer = {};
    let files = fs.readdirSync(folder);
    for(file of files) {
        let filePath = path.join(folder, file);
        var myFile = {};
        myFile.path = filePath;
        myFile.name = file;
        let stat = fs.lstatSync(filePath);
        myFile.directory = stat.isDirectory();
        if(filter === undefined || filter(myFile)) {
            answer[file] = myFile;
        }
        if(myFile.directory) {
            if(recursively) {
                var children = listFileInFolder(filePath, true, filter);
                // console.log('Children: ');
                // console.dir(children);
                // console.log('');
                myFile['children'] = children;
            }
            myFile.extension = '';
        } else {
            myFile.extension = path.extname(file);
        }
    }
    return answer;
}

function copyFiles(projectFolder, copyInstructions) {
    for(let copyInstruction of copyInstructions) {
        let source = projectFolder + constants.SLASH + copyInstruction.source;
        if(!fse.pathExistsSync(source)) {
            throw new Error('Source: ' + source + ' does not exist');
        }
        let target = projectFolder + constants.SLASH + copyInstruction.target;
        if(!fse.pathExistsSync(target)) {
            throw new Error('Target: ' + target + ' does not exist');
        }
        let lStat = fs.lstatSync(source);
        if(lStat.isDirectory()) {
            copyDirectory(source, target + constants.SLASH + path.basename(source), true);
        } else if(lStat.isFile()) {
            let targetFileName = copyInstruction.name;
            if(targetFileName === undefined) {
                targetFileName = path.basename(source);
            }
            let targetFile = target + constants.SLASH + targetFileName;
            fs.copyFileSync(source, targetFile);
        } else {
            throw new Error('File Type is not expected');
        }
    }
}

function prepareFileForChange(filePath) {
    if(!fse.pathExistsSync(filePath)) {
        throw new Error('File: ' + filePath + ' does not exist');
    }
    let oldFilePath = filePath + constants.CONTENT_OLD_EXT;
    if(fs.existsSync(oldFilePath)) {
        // Old File (original file) exists -> remove current file and copy the old back to the file
        if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        fs.copyFileSync(oldFilePath, filePath);
    } else {
        // New Old file so we copy the file to the old file to keep the original alive
        fs.copyFileSync(filePath, oldFilePath);
    }
}

module.exports = {
    /**
     * Copies a source folder to a given destination folder as sub folder
     * @param {string} srcFolder - the source folder which must exist
     * @param {string} destFolder - the target folder that is created by the copy which may exist
     * @param {boolean} overwriteFiles - if true an existing files will be overwritten if they exist
     * @return Any feedback or an empty string if everything went through alright
     * @throws If Source or Parent Destination folders do not exist or if the user exits the copy because it copy already exists
     */
    copyDirectory(srcFolder, destFolder, overwriteFiles) {
        return copyDirectory(srcFolder, destFolder, overwriteFiles);
    },

    /**
     * Obtains the Content Folder of the Module
     * @param {string} moduleFolder - Folder of the Module which must exist
     * @returns {string} Content Folder if it could be found
     * @throws If the Module folder does not exit
     */
    getContentFolder(moduleFolder) {
        return getContentFolder(moduleFolder);
    },

    /**
     * Obtains the Resources Folder of the Module
     * @param {string} moduleFolder - Folder of the Module which must exist
     * @param {boolean} doCreate - if true then if the folder is missing it will be created
     * @returns {string} Content Folder if it could be found
     * @throws If the Module folder does not exit
     */
    getResourcesFolder(moduleFolder, doCreate) {
        return getResourcesFolder(moduleFolder, doCreate);
    },

    /**
     * Obtains the Sling Content Folder of the Module
     * @param {string} moduleFolder - Folder of the Module which must exist
     * @returns {string} Sling Content Folder if it could be found
     * @throws If the Module folder does not exit
     */
    getSlingContentFolder(moduleFolder) {
        return getSlingContentFolder(moduleFolder);
    },

    /**
     * Lists all files and folders in the given folder
     * @param folder {string} - Folder to look for entries in
     * @param recursively {boolean} - if true all sub folders are searched as well
     * @param filter {function} - Filter function that will get the file (name, path, directory) as single parameter
     * @returns {object} - An object that contains an object for each item found with the name as key (name, path, directory)
     *                     Sub folders are added as 'children' property
     * @throws If the folder does not exist
     */
    listFileInFolder(folder, recursively, filter) {
        return listFileInFolder(folder, recursively, filter);
    },

    /**
     * Copy files / directories
     * @param baseFolder {string} - The folder the copy instructions' paths are bases on
     * @param copyInstructions {array} - Copy Instruction array that contains objects with a source and target path and optional name. The target
     *                          path is the path to the folder that will contain the copied file / directory. The name, if provided, is the
     *                          new name of the copied file
     */
    copyFiles(baseFolder, copyInstructions) {
        copyFiles(baseFolder, copyInstructions);
    },

    /**
     * Prepares a file for being changed by making sure we use the original content.
     * This is achieved by creating an copy (.old) if non exist (no changes made yet)
     * and if it does exist delete the given file and replace with the backup
     * @param filePath {string} - Path to the file
     * @throws Error if the file does not exist
     */
    prepareFileForChange(filePath) {
        prepareFileForChange(filePath);
    }
}