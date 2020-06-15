var prompt = require('prompt-sync')();

function ask(question, options) {
    let myPrompt = question + ', options: ' + options;
    console.log(myPrompt);
    while(true) {
        var answer = prompt();
        for(let option of options) {
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
