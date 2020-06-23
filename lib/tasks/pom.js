const xml2js = require('xml2js');
const fs = require('fs');
const fse = require('fs-extra');
const builder = require('xmlbuilder2');

const constants = require('./constants');
const util = require('./util');

function getPlugins(pom) {
    if(pom === undefined) {
        throw new Error('POM is undefined');
    }
    if(pom.project === undefined) {
        throw new Error('POM Project is undefined');
    }
    let build = getPomEntry(pom.project, 'build');
    // console.log('Build entry: ');
    // console.dir(build);
    // console.log('');
    if (build === undefined) {
        throw new Error('No \'Build\' section found in POM');
    }
    let plugins = getPomListEntry(build, 'plugin');
    if (plugins === undefined) {
        throw new Error('No \'Plugins\' section found in POM');
    }
    // var plugins = build[0].plugins;
    // console.log('Plugins entry: ');
    // console.dir(plugins);
    // console.log('');
    return plugins;
}

function getPluginByName(plugins, name) {
    if(plugins === undefined || !Array.isArray(plugins)) {
        throw new Error('Plugins: \'' + plugins + '\' is not defined or not an array');
    }
    for(plugin of plugins) {
        if(plugin.artifactId[0] === name) {
            return plugin;
        }
    }
    return undefined;
}

function addSlingInitialContent(instructions, contentLineToBeAdded) {
    if(instructions === undefined) {
        throw new Error('Instructions: \'' + instructions + '\' is not defined');
    }
    var slingInitialContent = instructions['Sling-Initial-Content'];
    console.log('Old Sling Initial Content');
    console.dir(slingInitialContent);
    console.log('');
    if(slingInitialContent === undefined) {
        instructions['Sling-Initial-Content'] = [ '' ];
    }
    slingInitialContent = instructions['Sling-Initial-Content'][0];
    var split = slingInitialContent.split('\n');
    // Go through all lines, ignore the lines with just whitespaces and memorize the last line with text
    var index = 0;
    var count = 0;
    for(line of split) {
        if(line.replace(/\s/g, '') !== '') {
            index = count;
        }
        count++;
    }
    // console.log('Split: ' + split);
    // console.log('Last Line index: ' + index);
    if(split[index].charAt(split[index].length - 1) !== ',') {
        split[index] = split[index] + ',';
    }
    split.splice(index + 1, 0, contentLineToBeAdded);
    // console.log('Split after insert: ' + split);
    var newSlingInitialContent = '';
    for(line of split) {
        newSlingInitialContent = newSlingInitialContent + line + '\n';
    }
    newSlingInitialContent = newSlingInitialContent.substr(0, newSlingInitialContent.length - 1);
    instructions['Sling-Initial-Content'][0] = newSlingInitialContent;
    console.log('New Sling Initial Content');
    console.dir(newSlingInitialContent);
    console.log('');
}

function addNewPlugin(plugins, group, artifact, version) {
    if(plugins === undefined || !Array.isArray(plugins)) {
        throw new Error('Plugins: \'' + plugins + '\' is not defined or not an array');
    }
    if(group === undefined || artifact === undefined || version === undefined) {
        throw new Error('Group, Artifact or Version is undefined: ' + group + ', ' + artifact + ', ' + version);
    }
    console.log('Plugins entry: ');
    console.dir(plugins);
    console.log('');
    var newPlugin = {};
    newPlugin.groupId = group;
    newPlugin.artifactId = artifact;
    newPlugin.version = version;
    plugins.push(newPlugin);
    console.log('After Add Plugins entry: ');
    console.dir(plugins);
    console.log('');
    return newPlugin;
}

function ensurePluginExtensions(plugin) {
    let extensions = getPomEntry(plugin, 'extensions');
    if(extensions === undefined) {
        extensions = ['true'];
        plugin.extensions = extensions;
    } else {
        extensions[0] = 'true';
    }
}

function ensureSlingInitialContentResources(pom, acceptablePath, additionalPath, targetPath) {
    if(pom === undefined) {
        throw new Error('POM is undefined');
    }
    if(pom.project === undefined) {
        throw new Error('POM Project is undefined');
    }
    let build = getPomEntry(pom.project, 'build');
    if (build === undefined) {
        throw new Error('No \'Build\' section found in POM');
    }
    util.logObject(build, 'POM Build', 6);
    let resources = build.resources;
    if(resources !== undefined) {
        util.logObject(resources, 'Build Resources', 6);
    }
    if(resources === undefined) {
        resources = build.resources = [];
    }
    // Find already existing resource directory entry
    let resource;
    for(let item of resources) {
        util.logObject(item, 'Build Resource Item', 6);
        if(item.resource !== undefined) {
            util.logObject(item.resource, 'Build Resource Item Resource', 6);
            if(item.resource[0].directory[0] !== undefined) {
                util.logObject(item.resource[0].directory[0], 'Build Resource Item Resource Directory', 6);
                if(item.resource[0].directory[0].startsWith(acceptablePath)) {
                    resource = item.resource;
                    break;
                }
            }
        }
    }
    if(resource === undefined) {
        if(targetPath === undefined) {
            resources.push({'resource': [{'directory': additionalPath}]});
        } else {
            resources.push({'resource': [{'directory': additionalPath, 'targetPath': targetPath}]});
        }
    }
}

function getPomEntry(parent, name) {
    if(parent === undefined) {
        throw new Error('POM Entry: \'' + parent + '\' is not defined');
    }
    var entry = parent[name];
    if(entry !== undefined) {
        if(Array.isArray(entry) && entry.length > 0) {
            return entry[0];
        }
    }
    return entry;
}

function getPomListEntry(parent, name) {
    if(parent === undefined) {
        throw new Error('POM Entry: \'' + parent + '\' is not defined');
    }
    var entry = parent[name];
    if(entry === undefined) {
        // Try with a 's'
        entry = parent[name + 's'];
        if(entry !== undefined) {
            if(entry.length > 0) {
                entry = entry[0][name];
            } else {
                entry = undefined;
            }
        } else if(name.endsWith('y')) {
            entry = parent[name.substr(0, name.length - 1) + 'ies'];
            if(entry.length > 0) {
                entry = entry[0][name];
            } else {
                entry = undefined;
            }
        }
    }
    return entry;
}

function addNewPomListEntry(parent, name) {
    if(parent === undefined) {
        throw new Error('Parent Object: \'' + parent + '\' is not defined');
    }
    var multiple = name + 's';
    var entry = parent[multiple];
    if(entry === undefined) {
        parent[multiple] = [{}];
        entry = parent[multiple][0];
    } else if(entry.length == 0) {
        entry[0] = {};
        entry = entry[0];
    }
    var childEntry = entry[name];
    if(childEntry === undefined) {
        entry[name] = [{}];
        childEntry = entry[name];
    } else if(childEntry.length == 0) {
        childEntry[0] = {};
        childEntry = entry[name];
    }
    return childEntry;
}

function getExecutionByGoal(executions, goal) {
    if(executions === undefined || !Array.isArray(executions)) {
        throw new Error('Execution: \'' + executions + '\' is not defined or not an array');
    }
    for(execution of executions) {
        var goalEntry = getPomListEntry(execution, 'goal');
        if(goalEntry !== undefined && goalEntry[0] === goal) {
            return execution;
        }
    }
    return undefined;
}

function preparePOMFileHandling(pomFolder) {
    if(!fse.pathExistsSync(pomFolder)) {
        throw new Error('POM Folder: ' + pomFolder + ' does not exist');
    }
    var pomFilePath = pomFolder + constants.SLASH + constants.POM_FILE_NAME;
    var pomFilePathOld = pomFolder + constants.SLASH + constants.POM_FILE_NAME + constants.CONTENT_OLD_EXT;
    if(fs.existsSync(pomFilePathOld)) {
        // POM already handled -> remove new one, rename old to actual one
        if(fs.existsSync(pomFilePath)) {
            fs.unlinkSync(pomFilePath);
        }
        fs.renameSync(pomFilePathOld, pomFilePath);
    }
    return pomFilePath;
}

function writeUpdatedPOMFile(pomFolder, pom) {
    if(!fse.pathExistsSync(pomFolder)) {
        throw new Error('POM Folder: ' + pomFolder + ' does not exist');
    }
    console.log('Updated POM:');
    var pomFilePath = pomFolder + constants.SLASH + constants.POM_FILE_NAME;
    var pomFilePathOld = pomFolder + constants.SLASH + constants.POM_FILE_NAME + constants.CONTENT_OLD_EXT;
    var newPomContent = builder.create(pom).end({ prettyPrint: true});
    // Remove a particular line:
    var startIndex = newPomContent.indexOf('<![CDATA[[object Object]]]>');
    if(startIndex > -1) {
        var temp = newPomContent.substr(0, startIndex - 1);
        temp = temp + newPomContent.substr(startIndex + '<![CDATA[[object Object]]]>'.length + 1);
        newPomContent = temp;
    }
    fs.renameSync(pomFilePath, pomFilePathOld);
    console.log('Original File renamed -> write out new POM');
    fs.writeFileSync(pomFilePath, newPomContent, 'utf8');
    console.log('New POM file written to folder: ' + pomFolder);
    return pomFilePath;
}

module.exports = {

    /**
     * Obtains the plugins array
     * @param pom POM JSon Object
     * @returns {array} Array of Plugins
     * @throws If either the Build or Plugins section was missing
     */
    getPlugins(pom) {
        return getPlugins(pom);
    },

    /**
     * Obtains a plugin by its artifact id
     * @param plugins Array of plugins
     * @param name Artifact Id of the plugin
     * @eturns {object} - Plugin Object if found or undefined if not
     */
    getPluginByName(plugins, name) {
        return getPluginByName(plugins, name);
    },

    /**
     * Add the given Sling Initial Content Line to the instructions of a Maven Bundle Plugin
     * @param instructions Array of configuration entries
     * @param contentLineToBeAdded Line of Sling Initial Content to be added
     */
    addSlingInitialContent(instructions, contentLineToBeAdded) {
        addSlingInitialContent(instructions, contentLineToBeAdded);
    },

    /**
     * Add a new plugin
     * @param plugins {array} - Array of plugins
     * @param group {string} - Group Id of the plugin
     * @param artifact {string} - Artifact Id of the plugin
     * @param version {string} - Version of the Plugin
     * @returns {object} - Plugin object created
     */
    addNewPlugin(plugins, group, artifact, version) {
        return addNewPlugin(plugins, group, artifact, version);
    },

    ensurePluginExtensions(plugin) {
        ensurePluginExtensions(plugin);
    },

    ensureSlingInitialContentResources(pom, acceptablePath, additionalPath) {
        ensureSlingInitialContentResources(pom, acceptablePath, additionalPath);
    },

    /**
     * Obtain an entry by name
     * @param parent Either an object of an array of objects in which we take the first object to look up the entry
     * @param name Name of the entry to look up
     * @returns {object} - Returns the object if found otherwise undefined
     */
    getPomEntry(parent, name) {
        return getPomEntry(parent, name);
    },

    /**
     * Obtains a Entry where there is a list (like instructions, plugins etc) and we are looking for the array of the entries
     * @param parent Parent Object to search in
     * @param name Name of the List Entry to be found
     * @returns {array} - Array containing the list (list of instruction or plugin) or undefined if not found
     */
    getPomListEntry(parent, name) {
        return getPomListEntry(parent, name);
    },

    /**
     * Create a list entry (array of (name + 's') with one entry, array of (name) with one entry
     * If the outer / inner list entry exist if will be used instead of a new one created
     * @param parent Object which will contain that list entry
     * @param name Name of the single list entry
     * @returns {array} - list entry created (array of (name))
     */
    addNewPomListEntry(parent, name) {
        return addNewPomListEntry(parent, name);
    },

    getExecutionByGoal(executions, goal) {
        return getExecutionByGoal(executions, goal);
    },

    /**
     * Make the '.old' POM file the actual one but before it deletes the current one
     * @param pomFolder Folder that contains the POM file
     * @returns {string} File Path of the POM file
     */
    preparePOMFileHandling(pomFolder) {
        return preparePOMFileHandling(pomFolder);
    },

    writeUpdatedPOMFile(pomFolder, pom) {
        return writeUpdatedPOMFile(pomFolder, pom);
    }
}