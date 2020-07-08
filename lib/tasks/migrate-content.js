const fse = require('fs-extra');
const xml2js = require('xml2js');
const fs = require('fs');

const { getSlingContentFolder, listFileInFolder } = require('./per-fs');
const peregrine = require('./peregrine');
const constants = require('./constants')
const pomLib = require('./pom');
const util = require('./util');

const parser = new xml2js.Parser();

const DIRECTORY_ADJUSTER = {'adjust': 'directory', 'adjusters': [{'search': 'jcr_root', 'replace': 'SLING-CONTENT'}]};

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

function directoryAndJsonFilter(file) {
    // return file.directory || file.name.endsWith('.json');
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
                util.logObject(slingContentFolder, 'Sling Content Folders', 6);
                // console.log('Sling Content Folder: ' + slingContentFolder);
                let contentFilesAndFolders = listFileInFolder(slingContentFolder, true, directoryAndJsonFilter);
                // util.logObject(contentFilesAndFolders, 'Sling Initial Content Folders', 6);
                if(Object.keys(contentFilesAndFolders).length > 0) {
                    // Make sure resources are made available
                    pomLib.ensureSlingInitialContentResources(pom, 'src/main/resources', 'src/main/resources/SLING-CONTENT', 'SLING-CONTENT');
                    for(const key in contentFilesAndFolders) {
                        let contentFilesAndFolder = contentFilesAndFolders[key];
                        // util.logObject(contentFilesAndFolder, 'SIC Main Folder', 10);
                        let mainFolder = contentFilesAndFolder.name;
                        let subFolders = contentFilesAndFolder.children;
                        if(subFolders === undefined || subFolders.length === 0) {
                            let sicLine = 'SLING-CONTENT/' + mainFolder + ';path:=/' + mainFolder+ ';overwrite:=false';
                            // console.log('SIC Main Line: ' + sicLine);
                            pomLib.addSlingInitialContent(instructions, sicLine);
                        } else {
                            for(const key2 in subFolders) {
                                let subFolder = subFolders[key2];
                                // console.log('SIC, main: ' + mainFolder + ', sub folder: ' + subFolder.name);
                                let sicLine = 'SLING-CONTENT/' + mainFolder + '/' + subFolder.name + ';path:=/' + mainFolder + '/' + subFolder.name + ';overwrite:=false';
                                // console.log('SIC Line: ' + sicLine);
                                pomLib.addSlingInitialContent(instructions, sicLine);
                            }
                        }
                    }
                }
            } catch(err) { console.log('Caught Error: ' + err)};
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
        // util.logObject(sourcePom, 'Source POM', 10);
        // util.logObject(targetPom, 'Target POM', 10);
        for(let copyInstruction of copyInstructions) {
            util.logObject(copyInstruction, 'Copy Instruction', 4);
            let sourcePomEntry = pomLib.getEntryInPomObject(sourcePom, copyInstruction.source, 'Source');
            let targetPomEntry = pomLib.getEntryInPomObject(targetPom, copyInstruction.target, 'Target');
            util.logObject(sourcePomEntry, 'Source POM Entry', 4);
            util.logObject(targetPomEntry, 'Target POM Entry', 4);
            let folderName = util.getLastFolder(copyInstruction.source);
            let innerFolderName = getSingleFromMultiple(folderName);
            if(innerFolderName !== undefined) {
                if(Array.isArray(sourcePomEntry)) {
                    sourcePomEntry = sourcePomEntry[0];
                }
                let singleSourceEntry = sourcePomEntry[innerFolderName];
                if(!Array.isArray(singleSourceEntry)) {
                    singleSourceEntry = [singleSourceEntry];
                }
                // Find single entry in target
                let singleTargetEntry = targetPomEntry[innerFolderName];
                if(singleTargetEntry !==  undefined) {
                    // Single Entry found. If it is an array take the first other it is just that object
                    if (!Array.isArray(singleTargetEntry)) {
                        throw new Error('Single Target Folder must be an array but was not: ' + singleTargetEntry);
                    }
                } else {
                    // No Single Entry -> look for Multiple Entry
                    singleTargetEntry = targetPomEntry[folderName];
                    if(singleTargetEntry !== undefined) {
                        if(Array.isArray(singleTargetEntry)) {
                            singleTargetEntry = singleTargetEntry[0];
                            if (singleTargetEntry[innerFolderName] !== undefined) {
                                singleTargetEntry = singleTargetEntry[innerFolderName];
                                if (!Array.isArray(singleTargetEntry)) {
                                    throw new Error('Multiple Inner Target Folder must be an array but was not: ' + singleTargetEntry);
                                }
                            } else {
                                // No Single Entry -> create it
                                singleTargetEntry[innerFolderName] = [];
                                singleTargetEntry = singleTargetEntry[innerFolderName];
                            }
                        } else {
                            singleTargetEntry[innerFolderName] = [];
                            singleTargetEntry = singleTargetEntry[innerFolderName];
                        }
                    } else {
                        targetPomEntry[folderName] = [{innerFolderName: []}];
                        singleTargetEntry = targetPomEntry[folderName][0][innerFolderName];
                    }
                }
                for(let source of singleSourceEntry) {
                    source = adjustPomEntry(source, copyInstruction);
                    source = adjustPomEntry(source, DIRECTORY_ADJUSTER);
                    singleTargetEntry.push(source);
                }
            } else {
                // Plain copy for no-multiple entries
                sourcePomEntry = adjustPomEntry(sourcePomEntry, copyInstruction);
                sourcePomEntry = adjustPomEntry(sourcePomEntry, DIRECTORY_ADJUSTER);
                if(Array.isArray(targetPomEntry)) {
                    targetPomEntry.push(sourcePomEntry);
                } else {
                    targetPomEntry[folderName] = sourcePomEntry;
                }
            }
        }
        // Write Core POM back to the file system
        util.logObject(targetPom, 'Updated Target POM', 10);
    })
}

function adjustPomEntry(pomEntry, copyInstruction) {
    // Handle Adjustments
    let adjust = copyInstruction.adjust;
    let adjusters = copyInstruction.adjusters;
    if(adjust !== undefined) {
        let adjustEntry = pomEntry[adjust];
        let isArray = Array.isArray(adjustEntry);
        if(isArray) { adjustEntry = adjustEntry[0]; }
        if(adjustEntry !== undefined) {
            for(let adjuster of adjusters) {
                let search = adjuster.search;
                let replace = adjuster.replace;
                console.log('Search for: ' + search + ', replace: ' + replace + ' of: ' + adjustEntry);
                let newText = util.searchAndReplace(adjustEntry, search, replace, true);
                if(isArray) {
                    pomEntry[adjust][0] = newText;
                } else {
                    pomEntry[adjust] = newText;
                }
                console.log('New, Adjusted POM Entry: ' + pomEntry[adjust]);
            }
        }
    }
    return pomEntry;
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

function adjustPOMModules(pomFolder, additions, removals) {
    console.log('POM Folder: ' + pomFolder);
    let pomFilePath = pomLib.preparePOMFileHandling(pomFolder);
    fs.readFile(pomFilePath, function(err, data) {
        parser.parseString(data, function (err, pom) {
            let pomModules = pomLib.getPomListEntry(pom.project, 'module');
            util.logObject(pomModules, 'POM Modules', 6);
            if(additions !== undefined) {
                if(!Array.isArray(additions)) {
                    additions = [additions];
                }
                for(let addition of additions) {
                    const index = pomModules.indexOf(addition);
                    if(index < 0) {
                        pomModules.push(addition);
                    }
                }
            }
            if(removals !== undefined) {
                if (!Array.isArray(removals)) {
                    removals = [removals];
                }
                for (let removal of removals) {
                    const index = pomModules.indexOf(removal);
                    if (index > -1) {
                        pomModules.splice(index, 1);
                    }
                }
            }
            pomLib.writeUpdatedPOMFile(pomFolder, pom);
        })
    })
}

function getSingleFromMultiple(name) {
    let answer;
    if(name.endsWith('s')) {
        if(name.endsWith('ies')) {
            answer = name.substr(0, name.length - 3) + 'y';
        } else {
            answer = name.substr(0, name.length - 1);
        }
    }
    return answer;
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
    },

    /**
     * Adds and/or Rmoves a Module from a POM
     * @param pomFolder {string} - Folder of the Parent POM
     * @param additions {array} - Array of Strings each of them are a module name of a module to be added
     * @param removals {array} - Array of Strings each of them are a module name of a module to be removed
     * @throws If the Parent POM Folder does not exist
     */
    adjustPOMModules(pomFolder, additions, removals) {
        return adjustPOMModules(pomFolder, additions, removals);
    }
}
