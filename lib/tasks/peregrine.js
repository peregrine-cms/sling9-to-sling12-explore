const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const { getContentFolder, getResourcesFolder, copyDirectory } = require('../tasks/per-fs');
const constants = require('../tasks/constants')

const parser = new xml2js.Parser();

function copyContent(sourceFolder, targetFolder) {
    // Get Source Content Folder and Target Resource Folder
    let contentFolder = getContentFolder(sourceFolder);
    if(contentFolder.startsWith('!!')) {
        return contentFolder;
    }
    let resourceFolder = getResourcesFolder(targetFolder);
    if(resourceFolder.startsWith('!!')) {
        return resourceFolder;
    }
    // Create Bundle Content Folder
    let slingContentFolder = resourceFolder + constants.SLASH + constants.SLING_CONTENT;
    fse.ensureDirSync(slingContentFolder);
    // Copy Content from Source to Sling Content Folder
    console.log('Source Folder: ' + contentFolder + 'target folder: ' + slingContentFolder);
    copyDirectory(contentFolder, slingContentFolder, true);

    return slingContentFolder;
}

function convertXML(slingContentFolder) {
    console.log('Convert XMLs in folder: ' + slingContentFolder);
    if(!fse.pathExistsSync(slingContentFolder)) {
        console.log('Content Folder: ' + slingContentFolder + ' does not exist -> fail');
        return '!!CONTENT_FOLDER_MISSING!!';
    }
    // let files = fs.readdirSync(slingContentFolder, { withFileTypes: true });
    let files = fs.readdirSync(slingContentFolder);
    files.forEach(file => {
        let filePath = path.join(slingContentFolder, file);
        if(file === constants.CONTENT_XML) {
            convertContentFile(filePath);
        } else
        if(fs.lstatSync(filePath).isDirectory()) {
            convertXML(filePath);
        }
    })
}

function convertContentFile(file) {
    console.log('Content File found: ' + file);
    var content = fs.readFileSync(file, { encoding: 'utf-8' });
    console.log('Content File Content: ' + content);
    fs.readFile(file, function(err, data) {
        parser.parseString(data, function (err, content) {
            // console.log('Parser Content Content: ' + JSON.stringify(content['jcr:root']['$'], true, 2));
            var jsonContent = JSON.stringify(content['jcr:root']['$'], replacer, 2);
            console.log('JSon Content: ' + jsonContent);
            var parent = path.dirname(file);
            var container = path.dirname(parent);
            var folderName = path.basename(parent);
            console.log('Folder Name: ' + folderName + ', container: ' + container);
            fs.writeFile(path.join(container, folderName + ".json"), jsonContent, function(err) {});
        });
    });
}

function replacer(key, value) {
    console.log('Replacer key: ' + key + ', value: ' + value);
    if(key.startsWith('xmlns:')) {
        return undefined;
    }
    return value;
}

module.exports = {
    /**
     * Copies the content of the Source Folder to the Target Folder
     * @param sourceFolder {string} - Source Folder (model's ui.apps or alike) which must exist
     * @param targetFolder {string} - Target Folder (model's core or alike) which must exist
     * @return {string} Folder of the Sling Content where the content was copied to
     */
    copyContent(sourceFolder, targetFolder) {
        return copyContent(sourceFolder, targetFolder)
    },

    convertXML(slingContentFolder) {
        convertXML(slingContentFolder);
    }
}