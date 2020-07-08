const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const xml2json = require('xml2json')

const { getContentFolder, getResourcesFolder, copyDirectory } = require('./per-fs');
const constants = require('./constants')
const util = require('./util')

const parser = new xml2js.Parser();

function copyContent(sourceFolder, targetFolder) {
    // Get Source Content Folder and Target Resource Folder
    let contentFolder = getContentFolder(sourceFolder);
    let slingContentFolder;
    if(contentFolder !== undefined) {
        let resourceFolder = getResourcesFolder(targetFolder, true);
        // Create Bundle Content Folder
        slingContentFolder = resourceFolder + constants.SLASH + constants.SLING_CONTENT;
        fse.ensureDirSync(slingContentFolder);
        // Copy Content from Source to Sling Content Folder
        console.log('Source Folder: ' + contentFolder + 'target folder: ' + slingContentFolder);
        copyDirectory(contentFolder, slingContentFolder, true);
    }

    return slingContentFolder;
}

function convertXML(slingContentFolder) {
    console.log('Convert XMLs in folder: ' + slingContentFolder);
    if(!fse.pathExistsSync(slingContentFolder)) {
        throw new Error('Sling Content Folder: ' + slingContentFolder + ' does not exist')
    }
    // let files = fs.readdirSync(slingContentFolder, { withFileTypes: true });
    let files = fs.readdirSync(slingContentFolder);
    files.forEach(file => {
        let filePath = path.join(slingContentFolder, file);
        if(file === constants.CONTENT_XML || file === constants.CONTENT_XML_OLD) {
            convertContentXmlFile(filePath);
        } else
        if(fs.lstatSync(filePath).isDirectory()) {
            convertXML(filePath);
        }
    })
}

function convertContentXmlFile(file) {
    console.log('Content File: ' + file);
    if(!fse.pathExistsSync(file)) {
        throw new Error('Content File: ' + file + ' does not exist')
    }
    fs.readFile(file, function(err, data) {
        let json = xml2json.toJson(data, { object: true });
        let jcrRoot = json[constants.JCR_ROOT];
        util.logObject(jcrRoot, 'XML 2 JSON File conversion:', 6);
        // Check if there is a jcr:root
        if(jcrRoot !== undefined) {
            // console.log('Parser Content Content: ' + JSON.stringify(content['jcr:root']['$'], true, 2));
            var jsonContent = JSON.stringify(jcrRoot, replacer, 2);
            console.log('JSon Content: ' + jsonContent);
            var parent = path.dirname(file);
            var container = path.dirname(parent);
            var folderName = path.basename(parent);
            console.log('Folder Name: ' + folderName + ', container: ' + container);
            fs.writeFile(path.join(container, folderName + constants.JSON_EXT), jsonContent, function(err) {});
            if(path.basename(file) !== constants.CONTENT_XML_OLD) {
                // Rename the file
                fs.renameSync(file, path.join(path.dirname(file), constants.CONTENT_XML_OLD));
            }
        }
    });
}

function replacer(key, value) {
    console.log('Replacer key: ' + key + ', value: ' + value);
    if(key.startsWith(constants.XMLNS_PREFIX)) {
        return undefined;
    }
    // Replace '[..]' to ['',...]
    if((typeof value) === 'string' && value.startsWith('[') && value.endsWith(']')) {
        let text = value.substr(1, value.length - 2);
        console.log('Array replacements: ' + text);
        value = text.split(',');
    }
    return value;
}

module.exports = {
    /**
     * Copies the content of the Source Folder to the Target Folder
     * @param sourceFolder {string} - Source Folder (model's ui.apps or alike) which must exist
     * @param targetFolder {string} - Target Folder (model's core or alike) which must exist
     * @return {string} Folder of the Sling Content where the content was copied to
     * @throws If Source or Target Folder do not exist
     */
    copyContent(sourceFolder, targetFolder) {
        return copyContent(sourceFolder, targetFolder)
    },

    /**
     * Converts XML files to JSon files
     * @param slingContentFolder Sling Content Folder
     * @throws If the Sling Content Folder does not exist
     */
    convertXML(slingContentFolder) {
        convertXML(slingContentFolder);
    },

    /**
     * Converts a Content Package to a Bundle Content
     * @param baseModuleFolder {string} - Folder Path of the Content Package Parent
     * @throws If the Base Module Folder does not exist
     */
    convertContentPackageToBundleContent(baseModuleFolder) {
        convertContentPackageToBundleContent(baseModuleFolder);
    }
}