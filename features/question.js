/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const request = require('request-promise-native');
const cheerio = require('cheerio');
const mrkdwn = require('html-to-mrkdwn');

const questionCache = {};

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

module.exports = function(controller) {
    controller.on('direct_mention', async(bot, message) => {
        const body = await request('https://learnedleague.com/samples.php');
        const $ = cheerio.load(body);
        const text = message.text.toLowerCase();
        let qid = Math.floor(Math.random() * 15) + 2;
        if (text.includes("easy")) {
            qid = Math.floor(Math.random() * 5) + 2;
        } else if (text.includes("medium")) {
            qid = Math.floor(Math.random() * 5) + 7;
        } else if (text.includes("hard")) {
            qid = Math.floor(Math.random() * 5) + 12;
        }
        const question = $(`body > center > table > tbody > tr > td > div:nth-child(9) > table > tbody > tr:nth-child(${qid}) > td:nth-child(2)`).html();
        const pct = $(`body > center > table > tbody > tr > td > div:nth-child(9) > table > tbody > tr:nth-child(${qid}) > td:nth-child(4)`).text();
        const answer = $(`#xyz${qid-1}`).text().trim();
        const answers = getPossibleAnswers(answer);
        const md = mrkdwn(question).text;
        let fixed = md.replace(/<([^|]*)\|[^>]*>/g, 'https://learnedleague.com$1');
        const category = fixed.substr(0, fixed.indexOf(' - '));
        fixed = fixed.substr(fixed.indexOf(' - ') + 3);
        console.log(fixed, answer, answers);
        await bot.startConversationInChannel(message.channel, 'fake');
        const questionMessage = await bot.say(fixed);
        const threadId = questionMessage.id;
        await bot.startConversationInThread(message.channel, 'fake', threadId);
        questionCache[threadId] = { answer, answers, category };
        await bot.say(`${pct}% of people on Learned League got this question correct`);
        await bot.say(`Type your answers here and I will do my best to try and determine if it's correct.
_(I may not parse answers properly if there are multiple choices)_
Type \`category\` to get the category and \`answer\` to get the answer.`);
        setTimeout(() => delete questionCache[threadId], 7 * 24 * 60 * 60 * 1000); // delete after 1 week
    });
    controller.on('message', async(bot, message) => {
        const threadId = message.thread_ts;
        if (threadId != null && threadId in questionCache) {
            const guess = message.text.toLowerCase().trim();
            const { answer, answers, category } = questionCache[threadId];
            const exactAnswer = answers[0];
            await bot.startConversationInThread(message.channel, 'fake', threadId);
            if (guess == 'ziaur') {
                await bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: 'ziaur1',
                });
                await bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: 'ziaur2',
                });
                await bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: 'ziaur3',
                });
            } else if (guess == 'category') {
                await bot.say(category);
            } else if (guess == 'answer') {
                await bot.say(answer);
                delete questionCache[threadId];
            } else if (guess == exactAnswer) {
                await bot.say(answer);
                delete questionCache[threadId];
            } else if (answers.includes(guess)) {
                await bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: 'white_check_mark',
                });
                await bot.say("You got at least one of the answers right! I don't know how many there are though, so when you think you're done just type 'answer'.");
            } else {
                await bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: 'x',
                });
            }
        }
    });

}
