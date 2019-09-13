/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const request = require('request-promise-native');
const cheerio = require('cheerio');
const mrkdwn = require('html-to-mrkdwn');

const questionCache = {};

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
        const answer = $(`#xyz${qid-1}`).text();
        const md = mrkdwn(question).text;
        const fixed = md.replace(/<([^|]*)\|[^>]*>/g, 'https://learnedleague.com$1');
        await bot.startConversationInChannel(message.channel, 'fake');
        const questionMessage = await bot.say(fixed);
        const threadId = questionMessage.id;
        await bot.startConversationInThread(message.channel, 'fake', threadId);
        questionCache[threadId] = answer.trim();
        await bot.say(`${pct}% of people on Learned League got this question correct`);
        await bot.say(`Type your answers here and I will do my best to try and determine if it's correct.
_(I may not parse answers properly if there are multiple choices)_
If you give up just type \`answer\`.`);
        setTimeout(() => delete questionCache[threadId], 7 * 24 * 60 * 60 * 1000); // delete after 1 week
    });
    controller.on('message', async(bot, message) => {
        const threadId = message.thread_ts;
        if (threadId != null && threadId in questionCache) {
            const guess = message.text.toLowerCase().trim();
            const answer = questionCache[threadId].trim();
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
            } else if (guess == 'answer') {
                await bot.say(answer);
                delete questionCache[threadId];
            } else if (guess == answer.toLowerCase()) {
                await bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: 'white_check_mark',
                });
                delete questionCache[threadId];
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
