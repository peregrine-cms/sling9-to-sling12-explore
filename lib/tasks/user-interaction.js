var prompt = require('prompt-sync')();

function ask(question, options) {
    var myOptions = [];
    var count = 0;
    options.forEach(item => {
        var startIndex = item.indexOf('[');
        if(startIndex >= 0) {
            var endIndex = item.indexOf(']');
            if(endIndex > startIndex) {
                var clean = '';
                var short = item.substr(startIndex + 1, endIndex - 1);
                if(startIndex > 0) {
                    clean = clean + item.substr(0, startIndex - 1);
                }
                clean = clean + short;
                if(endIndex < item.length - 1) {
                    clean = clean + item.substr(endIndex + 1);
                }
                myOptions[count++] = clean;
                myOptions[count++] = short;
            } else {
                myOptions[count++] = item;
            }
        } else {
            myOptions[count++] = item;
        }
    });
    console.log("My Options: " + myOptions);
    let myPrompt = question + ', options: ' + options;
    console.log(myPrompt);
    while(true) {
        var answer = prompt();
        for(let option of myOptions) {
            if(option === answer) {
                return answer;
            }
        }
        console.log('Your response: ' + answer + ' is not one of the options: ' + options + '. Try again');
    }
}

module.exports = {
    /**
     * Ask the
     * @param {string} question - Question to ask
     * @param {[string]} options - The options of the user
     * @return {string} The option selected
     */
    ask(question, options) {
        return ask(question, options);
    }
}
