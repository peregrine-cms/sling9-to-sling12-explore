
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

function getLastFolder(searchFolders) {
    let folders = searchFolders.split('/');
    let answer;
    for(let folder of folders) {
        if(folder.indexOf('=') > 0) {
            break;
        } else {
            answer = folder;
        }
    }
    return answer;
}

function searchAndReplace(text, search, replace, onlyFirst) {
    logObject(text, 'Given Text', 6);
    // console.log('Text: ' + text + ', type: ' + (typeof text));
    let index = text.indexOf(search);
    console.log('Search Index: ' + index);
    while(index >= 0) {
        let temp = text.substr(0, index);
        console.log('First Part: ' + temp);
        temp += replace;
        console.log('Added Replace: ' + temp);
        console.log('End Index: ' + (index + search.length));
        temp += text.substr(index + search.length);
        console.log('Final Text: ' + temp);
        text = temp;
        if(onlyFirst) {
            break;
        }
        index = text.indexOf(search);
    }
    return text;
}

module.exports = {
    /**
     * Search for an entry in the array with the given property name and value
     * @param array {array} - Array of Objects to look into
     * @param name {string} - Name of the Property to check
     * @param value {string} - Value of the Property to check
     * @returns {number} - Index of the first entry found in the array that has the matching property or -1 if not found
     */
    indexOfArrayEntryByProperty(array, name, value) {
        return indexOfArrayEntryByProperty(array, name, value);
    },

    /**
     * Logs a complex object
     * @param object {object} - Object to be logged
     * @param title {string} - Title that starts the output
     * @param depth {number} - Depth of the object output. Must be greater than 0
     */
    logObject(object, title, depth) {
        logObject(object, title, depth);
    },

    /**
     * Obtains the leaf folder
     * @param searchFolders {string} - The path to look for the last entry. If it contains a property value pair (separated
     *                                 by an equal sign) then the search ends and the previous folder is returned
     * @returns {string) - The leaf folder of the string (seaprated by a slash) or then one pefore a property value pair
     */
    getLastFolder(searchFolders) {
        return getLastFolder(searchFolders);
    },

    /**
     * Searches for the occurrence in the given text and if found replaces it
     * @param text {string} - Text to look in and replace
     * @param search {string} - Text to look for
     * @param replace {string} - Text to replace the search string if found
     * @param onlyFirst {boolean} - If true only the first occurrence is replaced other all occurrences found
     * @returns {string} - Adjusted text or if nothing is found the original text
     */
    searchAndReplace(text, search, replace, onlyFirst) {
        return searchAndReplace(text, search, replace, onlyFirst);
    }
}