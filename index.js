const fs = require('fs');
const xml2js = require('xml2js');
const  builder = require('xmlbuilder2');

const { setup } = require('./lib/tasks/conversion-setup');
const { convertContentPackageToBundleContent, adjustFileContent } = require('./lib/tasks/converter');
const { migrateCP2FM } = require('./lib/tasks/adjust-fm-project');
const { copyFiles } = require('./lib/tasks/per-fs');

console.log('=== time to move to sling12');

let thisFolder = __dirname
console.log('First Copy Peregrine into our Output Folder, this folder: ' + thisFolder);
let projectFolder = setup(thisFolder);
let pomCopyInstructions = [
    { 'source': 'project/build/resources', 'target': 'project/build'},
    { 'source': 'project/build/plugins/plugin/artifactId=frontend-maven-plugin', 'target': 'project/build/plugins/plugin'}
];
let vueModule = { 'parent': 'pagerenderer', 'name': 'vue', 'core': 'core', 'ui': 'ui.apps', 'coreArtifact': 'pagerender-vue', 'pomCopy': pomCopyInstructions};
let modules = [
    { 'parent': 'platform', 'name': 'base', 'core': 'core', 'ui': 'ui.apps'},
    { 'parent': 'platform', 'name': 'felib', 'core': 'core', 'ui': 'ui.apps'},
    { 'parent': 'platform', 'name': 'replication', 'core': 'core', 'ui': 'ui.apps'},
    vueModule
];
for(let module of modules) {
    convertContentPackageToBundleContent(projectFolder, module);
}

// Copy additional source files for pagerenderer/vue
let copies = [
    {'source': 'pagerenderer/vue/ui.apps/jsdoc.config.json', 'target': 'pagerenderer/vue/core'},
    {'source': 'pagerenderer/vue/ui.apps/package.json', 'target': 'pagerenderer/vue/core'},
    {'source': 'pagerenderer/vue/ui.apps/package-lock.json', 'target': 'pagerenderer/vue/core'},
    {'source': 'pagerenderer/vue/ui.apps/rollup.config.js', 'target': 'pagerenderer/vue/core'},
    {'source': 'pagerenderer/vue/ui.apps/src/main/js', 'target': 'pagerenderer/vue/core/src/main'},
    {'source': 'buildscripts/buildvue.js', 'target': 'buildscripts', 'name': 'buildvue-pv.js'}
];
copyFiles(projectFolder, copies);
// Adjust pagerenderer/vue files
// First the rollup configuration to use the correct output path
adjustFileContent(
    projectFolder + '/pagerenderer/vue/core/rollup.config.js',
    [{'type': 'raw', 'search': 'target/classes/etc/felibs/pagerendervue/js/perview.js', 'replace': 'target/classes/SLING-CONTENT/etc/felibs/pagerendervue/js/perview.js'}]
);
// Then the package configuration to use a different (adjusted) buildvue script
adjustFileContent(
    projectFolder + '/pagerenderer/vue/core/package.json',
    [{'type': 'raw', 'search': 'buildscripts/buildvue.js', 'replace': 'buildscripts/buildvue-pv.js'}]
);
// Finally adjust the buildvue script to use the correct output paths
adjustFileContent(
    projectFolder + '/buildscripts/buildvue-pv.js',
    [
        {'type': 'raw', 'search': 'src/main/content/jcr_root/apps', 'replace': 'src/main/resources/SLING-CONTENT/apps'},
        {'type': 'raw', 'search': './target/classes/etc/felibs/', 'replace': './target/classes/SLING-CONTENT/etc/felibs/'}
    ]
);

migrateCP2FM(projectFolder, modules);
