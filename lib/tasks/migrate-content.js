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

function addBundleContentToPOM(bundleFolder) {
    console.log('Bundle Folder: ' + bundleFolder);
    if(!fse.pathExistsSync(bundleFolder)) {
        throw new Error('Bundle Folder: ' + bundleFolder + ' does not exist')
    }
    let pomFilePath = pomLib.preparePOMFileHandling(bundleFolder);
    fs.readFile(pomFilePath, function(err, data) {
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
                let slingContentFolder = getSlingContentFolder(bundleFolder);
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

            pomLib.writeUpdatedPOMFile(bundleFolder, pom);
        })
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
     * @param bundleFolder {string} - Folder of the Bundle
     * @throws If the Bundle Folder does not exist or if the POM handling failed
     */
    addBundleContentToPOM(bundleFolder) {
        return addBundleContentToPOM(bundleFolder);
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
