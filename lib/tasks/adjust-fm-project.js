const fse = require('fs-extra');
const xml2js = require('xml2js');
const fs = require('fs');

const constants = require('./constants')
const pomLib = require('./pom');
const util = require('./util');

const parser = new xml2js.Parser();

function migrateCP2FM(projectFolder, modules) {
    // Prepare POM
    if(!fse.pathExistsSync(projectFolder)) {
        throw new Error('Project Folder: ' + projectFolder + ' does not exist')
    }
    let fmProjectPath = projectFolder + constants.SLASH + constants.FM_PROJECT_FOLDER_PATH;
    if(!fse.pathExistsSync(fmProjectPath)) {
        throw new Error('FM Project Folder: ' + fmProjectPath + ' does not exist')
    }
    console.log('FM Project Path: ' + fmProjectPath);
    let pomFilePath = pomLib.preparePOMFileHandling(fmProjectPath);
    fs.readFile(pomFilePath, function(err, data) {
        parser.parseString(data, function (err, pom) {
            if (!Array.isArray(modules)) {
                throw new Error('To Migrate Content Packages to FM in POM a module array is expected but was: ' + modules);
            }
            for (let module of modules) {
                if(module === undefined || module.length === 0) {
                    throw new Error('Module is not defined');
                }
                let cpArtifactId = (module.uiArtifact === undefined ? module.name + '.ui.apps' : module.uiArtifact);
                let fmArtifactId = (module.coreArtifact ? module.coreArtifact : module.name + '.core');
                // Remove CP Dependency if found
                let dependencies = pomLib.getPomListEntry(pom.project, 'dependency');
                // util.logObject(dependencies, 'Dependencies', 6);
                let i1 = util.indexOfArrayEntryByProperty(dependencies, 'artifactId', cpArtifactId);
                if (i1 >= 0) {
                    util.logObject(dependencies[i1], 'Dependency found for deletion', 6);
                    // Remove it if found
                    dependencies.splice(i1, 1);
                }
                let plugins = pomLib.getPlugins(pom);
                // Find Sling Feature Converter Maven Plugin
                let converterPlugin = pomLib.getPluginByName(plugins, constants.SLING_FEATURE_CONVERTER_MAVEN_PLUGIN_ARTIFACT);
                util.logObject(converterPlugin, 'Converter Plugin', 12);
                // Find 'convert-cp' goal execution
                let executions = pomLib.getPomListEntry(converterPlugin, constants.EXECUTION);
                // util.logObject(executions, 'Converter Plugin Executions', 6);
                let execution = pomLib.getExecutionByGoal(executions, 'convert-cp');
                // util.logObject(execution, 'Converter Plugin Execution', 6);
                // Find configuration content-package entry with the given artifact id
                let configuration = pomLib.getPomEntry(execution, 'configuration');
                let contentPackages = pomLib.getPomListEntry(configuration, 'contentPackage');
                // util.logObject(contentPackages, 'Content Packages', 6);
                let i2 = util.indexOfArrayEntryByProperty(contentPackages, 'artifactId', cpArtifactId);
                if (i2 >= 0) {
                    util.logObject(contentPackages[i2], 'Content Packages found for deletion', 6);
                    // Remove it if found
                    contentPackages.splice(i2, 1);
                }
                // Find Slingfeature Maven Plugin
                let slingfeaturePlugin = pomLib.getPluginByName(plugins, constants.SLING_FEATURE_MAVEN_PLUGIN_ARTIFACT);
                // util.logObject(slingfeaturePlugin, 'Slingfeature Plugin', 6);
                // Find 'aggregate-features' goal execution
                executions = pomLib.getPomListEntry(slingfeaturePlugin, constants.EXECUTION);
                // util.logObject(executions, 'Slingfeature Plugin Executions', 6);
                execution = pomLib.getExecutionByGoal(executions, 'aggregate-features');
                // util.logObject(execution, 'Slingfeature Plugin Execution', 6);
                configuration = pomLib.getPomEntry(execution, 'configuration');
                // util.logObject(configuration, 'Slingfeature Plugin Configuration', 6);
                let aggregates = pomLib.getPomListEntry(configuration, 'aggregate');
                // util.logObject(aggregates, 'Slingfeature Plugin Aggregates', 6);
                // Find aggregate with classifier 'example-runtime'
                let aggregate = aggregates[0];
                // util.logObject(aggregate, 'Slingfeature Plugin Aggregate', 6);
                let includeArtifacts = aggregate['include-artifact'];
                util.logObject(includeArtifacts, 'Slingfeature Plugin Include Artifact', 6);
                if (includeArtifacts === undefined) {
                    aggregate['include-artifact'] = [];
                    includeArtifacts = aggregate['include-artifact'];
                }
                let group = module.group === undefined ? '${project.groupId}' : module.group;
                console.log('FW Group Id: ' + group);
                console.log('FW Artifact Id: ' + fmArtifactId);
                let i3 = util.indexOfArrayEntryByProperty(includeArtifacts, 'artifactId', fmArtifactId);
                console.log('FW Artifact Index: ' + i3);
                if (i3 < 0) {
                    let newIncludeArtifact = {};
                    newIncludeArtifact.groupId = [group];
                    newIncludeArtifact.artifactId = [fmArtifactId];
                    newIncludeArtifact.version = ['${project.version}'];
                    newIncludeArtifact['type'] = ['slingosgifeature'];
                    newIncludeArtifact.classifier = [constants.PEREGRINE_CLASSIFIER];
                    includeArtifacts.push(newIncludeArtifact);
                }
                util.logObject(execution, 'Slingfeature Plugin Final Execution', 10);
            }
            pomLib.writeUpdatedPOMFile(fmProjectPath, pom);
        });
    });
}

module.exports = {

    /**
     * Migrates the Feature Model project from using Content Package Migration to native Feature Models
     * already converted
     * @param projectFolder {string} - Path to the project (absolute)
     * @param modules {array} - Array of module objects containing these properties:
     *                          - parent: name of the parent folder (not used here)
     *                          - name: name of the module
     *                          - core: name of the core module
     *                          - ui: name of the ui (content package) module
     *                          - group: name of the group (optional). Must be provided if not matching the project group
     *                          - coreArtifact: full name of the core artifact if it does not match the 'core' value followed by '.core'
     *                          - uiArtifact: full name of the ui artifact if it does not match the 'ui' value followed by '.ui.apps'
     *                          - pomCopy: pom copy instructions
     */
    migrateCP2FM(projectFolder, modules) {
        return migrateCP2FM(projectFolder, modules);
    }

}