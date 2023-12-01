const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { SubmissionsTable, StatsTable } = require('../../sequelcode');
const env = require('dotenv').config();
const myUserId = process.env.myUserId
const guildId =  process.env.guildId;
const qcRoleId = process.env.qcRoleId;
const modelRoleId = process.env.modelRoleId;
const qcChannelId = process.env.qcChannelId;
const modelsChannelId = process.env.modelsChannelId;
const approvalLogsId = process.env.approvalLogsId;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('approve')
		.setDescription('Approve a submission')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('The submission ID')
                .setRequired(true)
                .setMaxValue(999))
        .addStringOption(option =>
            option.setName('comment')
                .setDescription('Anything to add?')
                .setMaxLength(500)),
	async execute(interaction) {
        if (!await interaction.inGuild() || interaction.guild.id != guildId) {
            const validGuild = await interaction.client.guilds.fetch(guildId);
            return await interaction.reply({content:`This command can only be used in **${validGuild.name}**.`, ephemeral: true });
        } else if (interaction.channel.id != qcChannelId) {
            return await interaction.reply({content:`This command can only be used in the https://discord.com/channels/${guildId}/${qcChannelId} channel.`, ephemeral: true });
        } else if (!interaction.member.roles.cache.has(qcRoleId)) {
            return await interaction.reply({content:`You do not have permission to approve submissions. If you want to become a QC, you can apply for the role using the \`/jointeam\` command of the AI HUB bot.`, ephemeral: true });
        }
        
        const inputSubmissionId = await interaction.options.getInteger('id');
        const comment = await interaction.options.getString('comment') ?? 'N/A';

        const tag = await SubmissionsTable.findOne({ where: { dbSubmissionId: inputSubmissionId } });

        if (!tag) {
            return await interaction.reply({content:`No submission found with ID: ${inputsubid}. Please check if your submission ID is correct.`, ephemeral: true });
        }
    
        const userId = tag.get('dbUserId');

        const member = await interaction.guild.members.fetch(userId);
        const modelRole = await interaction.guild.roles.fetch(modelRoleId);

        try {
            await member.roles.add(modelRole);

            await SubmissionsTable.destroy({ where: { dbSubmissionId: inputSubmissionId } });
    
            const tag2 = await StatsTable.findOne({ where: { dbQcId: interaction.user.id } });
        
            const qcName = interaction.member.nickname ?? interaction.member.displayName;
    
            if (!tag2) {
                await StatsTable.create({
                    dbQcId: interaction.user.id,
                    dbQcCount: 1,
                    dbQcName: qcName,
                });
            } else {
                const currentQcCount = tag2.get('dbQcCount');
                await StatsTable.update({ dbQcCount: currentQcCount+1, dbQcName: qcName }, { where: { dbQcId: interaction.user.id } });
            }
    
            await interaction.reply(`<@${userId}> Your submission (ID: ${inputSubmissionId}) has been approved by **${qcName}**.\nComment: *${comment}*\nYou've been granted the Model Maker role and can now post in the https://discord.com/channels/${guildId}/${modelsChannelId} channel.`);

		} catch (error) {
            await interaction.reply({content:`Something went wrong... Please try again and see if it works. If the error still persists, consider pinging <@${myUserId}>.`, ephemeral: true });            
            console.error(`New error report! Occured on ${new Date().toUTCString()} while executing '/${interaction.commandName}'`);
            console.log(error);
		}

        if (approvalLogsId) {
            const submissionLink = tag.get('dbSubmissionLink');
            const approvalLogsThread = await interaction.guild.channels.fetch(approvalLogsId);
            await approvalLogsThread.send({ embeds: [new EmbedBuilder().setColor(`e74c3c`).setTitle('New voice model approved').setDescription(`**ID:** ${inputSubmissionId}\n**Submitted by:** <@${userId}>\n**Link:** ${submissionLink}\n\n**Approved by:** <@${interaction.user.id}>\n**Comment:** *${comment}*`)] });
        }
    }
};