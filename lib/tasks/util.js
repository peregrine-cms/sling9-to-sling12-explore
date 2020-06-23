
function indexOfArrayEntryByProperty(array, name, value) {
    let i = 0;
    if(array !== undefined && Array.isArray(array) && array.length > 0) {
        for(item of array) {
            let property = item[name];
            console.log('property: (index: ' + i );
            console.dir(property);
            console.log('');
            if(Array.isArray(property)) {
                if(property[0] === value) {
                    return i;
                }
            } else if(property === value) {
                return i;
            }
            i++;
        }
    }
    return -1;
}

function logObject(object, title, depth) {
    if(depth === undefined) {
        depth = 2;
    }
    console.log(title + ':')
    console.dir(object, {depth: depth});
    console.log('')
}

module.exports = {
    indexOfArrayEntryByProperty(array, name, value) {
        return indexOfArrayEntryByProperty(array, name, value);
    },

    logObject(object, title, depth) {
        logObject(object, title, depth);
    }
}