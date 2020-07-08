const fs = require('fs');
const xml2js = require('xml2js');
const  builder = require('xmlbuilder2');

const { setup } = require('./lib/tasks/conversion-setup');
const { convertContentPackageToBundleContent, adjustFileContent } = require('./lib/tasks/converter');
const { migrateCP2FM } = require('./lib/tasks/adjust-fm-project');
const { copyFiles } = require('./lib/tasks/per-fs');
const { adjustPOMModules } = require('./lib/tasks/migrate-content')

console.log('=== time to move to sling12');

let thisFolder = __dirname
console.log('First Copy Peregrine into our Output Folder, this folder: ' + thisFolder);
let projectFolder = setup(thisFolder);

// Copy themeclean-flex into our project
let themeCleanFlexCopies = [
    {'source': '../themeclean-flex', 'target': './themes'}
];
copyFiles(projectFolder, themeCleanFlexCopies);

let pomCopyInstructions = [
    { 'source': 'project/build/resources', 'target': 'project/build', 'adjust':'targetPath', 'adjusters': [
        {'search': 'apps/', 'replace': 'SLING-CONTENT/apps/'}, {'search':'etc/', 'replace': 'SLING-CONTENT/etc/'}]
    },
    { 'source': 'project/build/plugins/plugin/artifactId=frontend-maven-plugin', 'target': 'project/build/plugins/plugin'}
];
let vueModule = {
    'parent': 'pagerenderer', 'name': 'vue', 'core': 'core', 'ui': 'ui.apps',
    'coreArtifact': 'pagerender-vue.core', 'uiArtifact': 'pagerender-vue.ui.apps', 'pomCopy': pomCopyInstructions
};
let themeCleanModule = {
    'parent': 'themes', 'name': 'themeclean', 'core': 'core', 'ui': 'ui.apps',
    'group': 'com.themeclean', 'coreArtifact': 'themeclean-core', 'uiArtifact': 'themeclean-ui.apps', 'pomCopy': pomCopyInstructions
};
let themeCleanFlexModule = {
    'parent': 'themes', 'name': 'themeclean-flex', 'core': 'core', 'ui': 'ui.apps',
    'group': 'com.themecleanflex', 'coreArtifact': 'themecleanflex.core', 'uiArtifact': 'themecleanflex.ui.apps', 'pomCopy': pomCopyInstructions
};
let adminBaseModule = {
    'parent': '.', 'name': 'admin-base', 'core': 'core', 'ui': 'ui.apps',
    'coreArtifact': 'admin.core', 'uiArtifact': 'admin.ui.apps', 'pomCopy': pomCopyInstructions
};
let modules = [
    { 'parent': 'platform', 'name': 'base', 'core': 'core', 'ui': 'ui.apps'},
    { 'parent': 'platform', 'name': 'felib', 'core': 'core', 'ui': 'ui.apps'},
    { 'parent': 'platform', 'name': 'replication', 'core': 'core', 'ui': 'ui.apps'},
    adminBaseModule,
    vueModule,
    themeCleanModule,
    themeCleanFlexModule
];
for(let module of modules) {
    convertContentPackageToBundleContent(projectFolder, module);
}

// Copy additional source files for pagerenderer/vue
let copies = [
    {'source': 'admin-base/ui.apps/src/main/buildjs', 'target': 'admin-base/core/src/main'},
    {'source': 'admin-base/ui.apps/src/main/js', 'target': 'admin-base/core/src/main'},
    {'source': 'admin-base/ui.apps/package.json', 'target': 'admin-base/core'},
    {'source': 'admin-base/ui.apps/package-lock.json', 'target': 'admin-base/core'},
    {'source': 'admin-base/ui.apps/rollup.config.js', 'target': 'admin-base/core'},
    {'source': 'admin-base/ui.apps/jsdoc.config.json', 'target': 'admin-base/core'},
    {'source': 'pagerenderer/vue/ui.apps/jsdoc.config.json', 'target': 'pagerenderer/vue/core'},
    {'source': 'pagerenderer/vue/ui.apps/package.json', 'target': 'pagerenderer/vue/core'},
    {'source': 'pagerenderer/vue/ui.apps/package-lock.json', 'target': 'pagerenderer/vue/core'},
    {'source': 'pagerenderer/vue/ui.apps/rollup.config.js', 'target': 'pagerenderer/vue/core'},
    {'source': 'pagerenderer/vue/ui.apps/src/main/js', 'target': 'pagerenderer/vue/core/src/main'},
    {'source': 'buildscripts/buildvue.js', 'target': 'buildscripts', 'name': 'buildvue-pv.js'}
];
copyFiles(projectFolder, copies);
// Adjust Admin Base files
adjustFileContent(
    projectFolder + '/admin-base/core/package.json',
    [{'type': 'raw', 'search': 'buildscripts/buildvue.js', 'replace': 'buildscripts/buildvue-pv.js'}]
);
adjustFileContent(
    projectFolder + '/admin-base/core/rollup.config.js',
    [{'type': 'raw', 'search': 'target/classes/etc/felibs/', 'replace': 'target/classes/SLING-CONTENT/etc/felibs/'}]
);

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
// Then the Copy Felibs Script to use a different (adjusted) Content Root
adjustFileContent(
    projectFolder + '/buildscripts/copyfelibs.js',
    [
        {'type': 'raw', 'search': 'src/main/content/jcr_root', 'replace': 'src/main/resources/SLING-CONTENT'},
        {'type': 'raw', 'search': 'target/classes/etc/felibs/admin/dependencies', 'replace': 'target/classes/SLING-CONTENT/etc/felibs/admin/dependencies'}
    ]
);
// Finally adjust the buildvue script to use the correct output paths
adjustFileContent(
    projectFolder + '/buildscripts/buildvue-pv.js',
    [
        {'type': 'raw', 'search': 'src/main/content/jcr_root/apps', 'replace': 'src/main/resources/SLING-CONTENT/apps'},
        {'type': 'raw', 'search': './target/classes/etc/felibs/', 'replace': './target/classes/SLING-CONTENT/etc/felibs/'}
    ]
);

// Copy additional source files for themes/themeclean
copies = [
    {'source': 'themes/themeclean/ui.apps/package.json', 'target': 'themes/themeclean/core'},
    {'source': 'themes/themeclean/ui.apps/package-lock.json', 'target': 'themes/themeclean/core'},
    {'source': 'themes/themeclean/ui.apps/src/main/content/buildscripts', 'target': 'themes/themeclean/core/src/main'}
];
copyFiles(projectFolder, copies);
// First adjust the package configuration to use a different (adjusted) buildvue script
adjustFileContent(
    projectFolder + '/themes/themeclean/core/package.json',
    [
        {'type': 'raw', 'search': 'themes/themeclean/ui.apps', 'replace': 'themes/themeclean/core'},
        {'type': 'raw', 'search': './src/main/content/buildscripts/buildvue.js', 'replace': './src/main/buildscripts/buildvue.js'}
    ]
);
// Finally adjust the buildvue script to use the correct output paths
adjustFileContent(
    projectFolder + '/themes/themeclean/core/src/main/buildscripts/buildvue.js',
    [
        {'type': 'raw', 'search': 'src/main/content/jcr_root/apps', 'replace': 'src/main/resources/SLING-CONTENT/apps'},
        {'type': 'raw', 'search': './target/classes/etc/felibs/', 'replace': './target/classes/SLING-CONTENT/etc/felibs/'}
    ]
);

// Handle Themeclean-Flex
// Copy the files from UI Apps into Core
copies = [
    {'source': 'themes/themeclean-flex/ui.apps/package.json', 'target': 'themes/themeclean-flex/core'},
    {'source': 'themes/themeclean-flex/ui.apps/package-lock.json', 'target': 'themes/themeclean-flex/core'},
    {'source': 'themes/themeclean-flex/ui.apps/postcss.config.js', 'target': 'themes/themeclean-flex/core'},
    {'source': 'themes/themeclean-flex/ui.apps/tailwind.config.js', 'target': 'themes/themeclean-flex/core'},
    {'source': 'themes/themeclean-flex/ui.apps/src/main/content/buildscripts', 'target': 'themes/themeclean-flex/core/src/main'}
];
copyFiles(projectFolder, copies);
// First adjust the package configuration to use a different folder
adjustFileContent(
    projectFolder + '/themes/themeclean-flex/core/package.json',
    [
        {'type': 'raw', 'search': 'ui.apps', 'replace': 'core'},
        {'type': 'raw', 'search': './src/main/content/buildscripts', 'replace': './src/main/buildscripts'},
        {'type': 'raw', 'search': './src/main/content/jcr_root', 'replace': './src/main/resources/SLING-CONTENT'}
    ]
);
// Finally adjust the buildvue script to use the correct output paths
adjustFileContent(
    projectFolder + '/themes/themeclean-flex/core/src/main/buildscripts/buildvue.js',
    [
        {'type': 'raw', 'search': 'src/main/content/jcr_root', 'replace': 'src/main/resources/SLING-CONTENT'},
        {'type': 'raw', 'search': './target/classes/etc/felibs/', 'replace': './target/classes/SLING-CONTENT/etc/felibs/'}
    ]
);

migrateCP2FM(projectFolder, modules);
adjustPOMModules(projectFolder, ['themes/themeclean-flex'], undefined);
