const request = require('request-promise-native');
const cheerio = require('cheerio');

function stripTrailingS(str) {
    if (str.endsWith('s')) {
        return str.substr(0, str.length-1);
    }
    return str;
}

function getPossibleAnswers(answer) {
    low = answer.toLowerCase();
    low = low.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    answers = [low];
    withoutParens = low.replace(/\([^)]*\)/g, '').replace(/ ,/g, ',');
    answers = answers.concat(low.split('/'));
    answers = answers.concat(low.split(';').map(s => s.trim()));
    answers = answers.concat(low.split(',').map(s => s.trim()));
    answers = answers.concat(withoutParens.split(',').map(s => s.trim()));
    parens = low.match(/\([^)]*\)/g);
    if (parens) {
        for (match of parens) {
            answers.push(match.substr(1,match.length-2));
        }
    }
    answers = answers.concat(answers.map(stripTrailingS));
    return [...new Set(answers)];
}

async function main() {
    const body = await request('https://learnedleague.com/samples.php');
    const $ = cheerio.load(body);
    for(let i = 1; i < 15;i++) {
        const answer = $(`#xyz${i}`).text().trim();
        console.log(answer,getPossibleAnswers(answer));
    }
}
main();
