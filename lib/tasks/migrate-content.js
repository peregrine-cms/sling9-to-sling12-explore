const fse = require('fs-extra');
const xml2js = require('xml2js');
const fs = require('fs');

const { getSlingContentFolder, listFileInFolder } = require('./per-fs');
const peregrine = require('./peregrine');
const constants = require('./constants')
const pomLib = require('./pom');
const util = require('./util');

const parser = new xml2js.Parser();

function migrateContent(moduleFolder, sourceFolderName, targetFolderName) {
    // Check the Module Folder
    if(!fse.pathExistsSync(moduleFolder)) {
        throw new Error('Module Folder: ' + moduleFolder + ' does not exist')
    }
    // Get Source and Target Module folder
    let sourceFolder = moduleFolder + constants.SLASH + sourceFolderName;
    if(!fse.pathExistsSync(sourceFolder)) {
        throw new Error('Source Folder: ' + sourceFolder + ' does not exist')
    }
    let targetFolder = moduleFolder + constants.SLASH + targetFolderName;
    if(!fse.pathExistsSync(targetFolder)) {
        throw new Error('Target Folder: ' + targetFolder + ' does not exist')
    }
    // Copy the Content from ui.apps to core
    let slingContentFolder = peregrine.copyContent(sourceFolder, targetFolder);
    if(slingContentFolder !== undefined) {
        // Convert .content.xml files to their JSon counterpart
        peregrine.convertXML(slingContentFolder);
    }

    return targetFolder;
}

function directoryFilter(file) {
    return file.directory;
}

function adjustCorePOM(coreFolder, uiFolder, copyInstructions) {
    console.log('Core Folder: ' + coreFolder);
    if(!fse.pathExistsSync(coreFolder)) {
        throw new Error('Core Folder: ' + coreFolder + ' does not exist')
    }
    let corePomFilePath = pomLib.preparePOMFileHandling(coreFolder);
    fs.readFile(corePomFilePath, function(err, data) {
        parser.parseString(data, function (err, pom) {
            // Search for the Maven Bundle Plugin
            let plugins = pomLib.getPlugins(pom);
            let bundlePlugin = pomLib.getPluginByName(plugins, constants.MAVEN_BUNDLE_PLUGIN);
            pomLib.ensurePluginExtensions(bundlePlugin);
            let configuration = pomLib.getPomEntry(bundlePlugin, 'configuration');
            let instructions = pomLib.getPomEntry(configuration, 'instructions');
            util.logObject(instructions, 'Slingfeature Plugin Instructions', 6);
            // let instructions = bundlePlugin.configuration[0].instructions[0];
            // Loop over the Sling Content folder and add them to the Sling Initial Content
            try {
                let slingContentFolder = getSlingContentFolder(coreFolder);
                // console.log('Sling Content Folder: ' + slingContentFolder);
                let contentFilesAndFolders = listFileInFolder(slingContentFolder, true, directoryFilter);
                util.logObject(contentFilesAndFolders, 'Sling Initial Content Folders', 6);
                if(Object.keys(contentFilesAndFolders).length > 0) {
                    // Make sure resources are made available
                    pomLib.ensureSlingInitialContentResources(pom, 'src/main/resources', 'src/main/resources/SLING-CONTENT', 'SLING-CONTENT');
                    for(const key in contentFilesAndFolders) {
                        let subFolders = contentFilesAndFolders[key].children;
                        for(const key in subFolders) {
                            let child = subFolders[key];
                            let sicLine = 'SLING-CONTENT/apps/' + child.name + ';path=/apps/' + child.name + ';overwrite=true';
                            console.log('SIC Line: ' + sicLine);
                            pomLib.addSlingInitialContent(instructions, sicLine);
                        }
                    }
                }
            } catch(err) {};
            // Search the POM file for the Slingfeature Maven Plugin
            let slingFeaturePlugin = pomLib.getPluginByName(plugins, constants.SLING_FEATURE_MAVEN_PLUGIN_ARTIFACT);
            util.logObject(slingFeaturePlugin, 'Slingfeature Plugin', 6);
            if(slingFeaturePlugin === undefined) {
                // If not found create a Slingfeature Maven Plugin
                slingFeaturePlugin = pomLib.addNewPlugin(
                    plugins,
                    constants.APACHE_MAVEN_GROUP,
                    constants.SLING_FEATURE_MAVEN_PLUGIN_ARTIFACT,
                    constants.SLING_FEATURE_MAVEN_PLUGIN_VERSION
                );
            }
            pomLib.ensurePluginExtensions(slingFeaturePlugin);
            let execution = pomLib.getPomListEntry(slingFeaturePlugin, 'execution');
            if(execution === undefined) {
                execution = pomLib.addNewPomListEntry(slingFeaturePlugin, 'execution');
            }
            util.logObject(execution, 'Slingfeature Plugin Execution', 6);

            let includeArtifact = pomLib.getExecutionByGoal(execution, 'include-artifact');
            if(includeArtifact === undefined) {
                // Create the 'include-artifact' execution entry
                includeArtifact = {};
                execution.push(includeArtifact);
                includeArtifact.id = ['create-fm'];
                includeArtifact.phase = ['package'];
                includeArtifact.goals = [{'goal': ['include-artifact']}];
                includeArtifact.configuration = [{'includeArtifactClassifier': [constants.PEREGRINE_CLASSIFIER],'includeDependenciesWithScope': ['compile']}];
            }
            util.logObject(includeArtifact, 'Include Artifact', 6);

            let attachArtifact = pomLib.getExecutionByGoal(execution, 'attach-features');
            if(attachArtifact === undefined) {
                // Create the 'attach-artifact' execution entry
                attachArtifact = {};
                execution.push(attachArtifact);
                attachArtifact.id = ['install-fm'];
                attachArtifact.phase = ['package'];
                attachArtifact.goals = [{'goal': ['attach-features']}];
            }
            util.logObject(attachArtifact, 'Attach Artifact', 6);

            if(copyInstructions !== undefined) {
                copyPomParts(pom, uiFolder + constants.SLASH + constants.POM_FILE_NAME, copyInstructions);
            }

            pomLib.writeUpdatedPOMFile(coreFolder, pom);
        })
    })
}

function copyPomParts(targetPom, sourcePomPath, copyInstructions) {
    if(!fse.pathExistsSync(sourcePomPath)) {
        throw new Error('Source POM Path: ' + sourcePomPath + ' does not exist')
    }
    if(copyInstructions === undefined || !Array.isArray(copyInstructions)) {
        throw new Error('Copy Instructions were not provided or are not an array');
    }
    const sourcePomXml = fs.readFileSync(sourcePomPath);
    parser.parseString(sourcePomXml, function(err, sourcePom) {
        util.logObject(sourcePom, 'Source POM', 10);
        util.logObject(targetPom, 'Target POM', 10);
        for(let copyInstruction of copyInstructions) {
            util.logObject(copyInstruction, 'Copy Instruction', 4);
            let sourcePomEntry = pomLib.getEntryInPomObject(sourcePom, copyInstruction.source, 'Source');
            let targetPomEntry = pomLib.getEntryInPomObject(targetPom, copyInstruction.target, 'Target');
            util.logObject(targetPomEntry, 'Target POM Entry', 4);
            if(Array.isArray(targetPomEntry)) {
                targetPomEntry.push(sourcePomEntry);
            } else {
                targetPomEntry[util.getLastFolder(copyInstruction.source)] = [sourcePomEntry];
            }
        }
        // Write Core POM back to the file system
        util.logObject(targetPom, 'Updated Target POM', 10);
    })
}


function removeModule(pomFolder, moduleName) {
    console.log('POM Folder: ' + pomFolder);
    let pomFilePath = pomLib.preparePOMFileHandling(pomFolder);
    fs.readFile(pomFilePath, function(err, data) {
        parser.parseString(data, function (err, pom) {
            let modules = pomLib.getPomListEntry(pom.project, 'module');
            console.log('Modules:');
            console.dir(modules, {depth: 6});
            console.log('');
            const index = modules.indexOf(moduleName);
            if(index > -1) {
                modules.splice(index, 1);
            }
            pomLib.writeUpdatedPOMFile(pomFolder, pom);
        })
    })
}

module.exports = {
    /**
     * Does the Content Migration of a Module
     * @param {string} moduleFolder - this module folder
     * @param {string} sourceFolderName - name of the source folder (ui.apps or so)
     * @param {string} targetFolderName - name of the target folder (core or so)
     * @return The path of the target (core or alike) or an error message
     */
    migrateContent(moduleFolder, sourceFolderName, targetFolderName) {
        return migrateContent(moduleFolder, sourceFolderName, targetFolderName);
    },

    /**
     * Adds the newly created Bundle Content to the POM for processing
     * @param coreFolder {string} - Folder of the Core Bundle
     * @param uiFolder {string} - Folder of the UI Bundle
     * @param copyInstructions {array} - Copy Instructions Array
     * @throws If the Bundle Folder does not exist or if the POM handling failed
     */
    adjustCorePOM(coreFolder, uiFolder, copyInstructions) {
        return adjustCorePOM(coreFolder, uiFolder, copyInstructions);
    },

    /**
     * Remove Content Package Module from Parent POM
     * @param pomFolder {string} - Folder of the Parent POM
     * @param moduleName {string} - Name of the Module
     * @throws If the Parent POM Folder does not exist
     */
    removeModule(pomFolder, moduleName) {
        return removeModule(pomFolder, moduleName);
    }
}
