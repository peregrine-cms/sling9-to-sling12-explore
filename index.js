const fs = require('fs');
const xml2js = require('xml2js');
const  builder = require('xmlbuilder2');

const { setup } = require('./lib/tasks/conversion-setup');
const { convertContentPackageToBundleContent } = require('./lib/tasks/converter');
const { migrateCP2FM } = require('./lib/tasks/adjust-fm-project');

console.log('=== time to move to sling12');

let thisFolder = __dirname
console.log('First Copy Peregrine into our Output Folder, this folder: ' + thisFolder);
let projectFolder = setup(thisFolder);
let modules = [
    'platform/base',
    'platform/felib',
    'platform/replication'
];
for(let module of modules) {
    convertContentPackageToBundleContent(projectFolder, module);
}

migrateCP2FM(projectFolder, modules);

// const parser = new xml2js.Parser();
//
// console.log(" > simple example: read the root pom from the peregrine project")
// fs.readFile('../peregrine-cms/pom.xml', function(err, data) {
//     parser.parseString(data, function (err, pom) {
//
//         // show the data structure in json up to 2 levels or so
//         console.log("Show Data Structure up to Level 2")
//         console.dir(pom);
//
//         // list some data from the pom
//         console.log("List POM's Properties")
//         pom.project.properties.forEach(element => {
//             console.log(element);
//         });
//
//         // read a property
//         console.log(`the password is: ${pom.project.properties[0]['sling.password']}`);
//
//         // change/write a property
//         // pom.project.properties[0]['sling.password'] = 'changeme';
//
//         // add a property
//         // pom.project.properties[0]['peregrine-name'] = 'peregrineCMS';
//
//         // show full json
//         console.log("Print POM as JSon")
//         console.log(JSON.stringify(pom, true, 2));
//
//         // convert back to xml
//         console.log("Converted Back to XML")
//         console.dirxml(builder.create(pom).end({ prettyPrint: true}));
//     });
// });
