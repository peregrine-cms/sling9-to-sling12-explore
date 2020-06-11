const fs = require('fs');
const xml2js = require('xml2js');
const  builder = require('xmlbuilder');

console.log('=== time to move to sling12');

const parser = new xml2js.Parser();

console.log(" > simple example: read the root pom from the peregrine project")
fs.readFile('../peregrine-cms/pom.xml', function(err, data) {
    parser.parseString(data, function (err, pom) {

        // show the data structure in json up to 2 levels or so
        // console.dir(pom);

        // list some data from the pom
        // pom.project.properties.forEach(element => {
        //     console.log(element);
        // });

        // read a property
        // console.log(`the password is: ${pom.project.properties[0]['sling.password']}`);

        // change/write a property
        // pom.project.properties[0]['sling.password'] = 'changeme';

        // add a property
        // pom.project.properties[0]['peregrine-name'] = 'peregrineCMS';

        // show full json
        // console.log(JSON.stringify(pom, true, 2));

        // convert back to xml
        // console.dirxml(builder.create(pom).end({ pretty: true}));
    });
});
