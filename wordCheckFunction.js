const slurs = ['Use these arrays', 'to prevent expressions', 'from being sent with the bot'];
const scamLinks = ['Use these arrays', 'to prevent expressions', 'from being sent with the bot'];
const noInvites = ['Use these arrays', 'to prevent expressions', 'from being sent with the bot'];
const pings = ['Use these arrays', 'to prevent expressions', 'from being sent with the bot']
const foreignLanguages = ['Use these arrays', 'to prevent expressions', 'from being sent with the bot']

const bannedWords = slurs.concat(scamLinks, noInvites, pings, foreignLanguages);

const placeholder = ['Put whatever you want here'];

module.exports = {
    bannedWords,
};