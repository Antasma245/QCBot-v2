const { REST, Routes } = require('discord.js');
const env = require('dotenv').config();
const token = process.env.token;
const clientId = process.env.clientId;

const rest = new REST().setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('Successfully deleted all commands from all guilds.'))
	.catch(console.error);