const { SlashCommandBuilder } = require('discord.js');
const { SubmissionsTable } = require('../../sequelcode');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription(`Check your submission's number in queue.`)
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('Your submission ID')
                .setRequired(true)
                .setMaxValue(999)),
	async execute(interaction) {
        const inputSubmissionId = await interaction.options.getInteger('id');
        
        let dbSubmissionsIdList = [];

        const dbSubmissionsIdRaw = await SubmissionsTable.findAll({ attributes: ['dbSubmissionId'], order: [['createdAt', 'ASC']] });
        dbSubmissionsIdList.push(...dbSubmissionsIdRaw.map((tag) => tag.dbSubmissionId));

        const length = dbSubmissionsIdList.length;

        if (!dbSubmissionsIdList.includes(inputSubmissionId)) {
            return await interaction.reply({content:`No submission found with ID: ${inputSubmissionId}. Please check if your submission ID is correct.`, ephemeral: true });
        }

        const preIndex = dbSubmissionsIdList.indexOf(inputSubmissionId);
        const index = preIndex+1;

        await interaction.reply({content:`Your submission (ID: ${inputSubmissionId}) is number ${index} out of ${length} in queue. It'll be reviewed shortly.`, ephemeral: true });

    }
};