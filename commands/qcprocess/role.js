const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const env = require('dotenv').config();
const myUserId = process.env.myUserId
const guildId =  process.env.guildId;
const qcRoleId = process.env.qcRoleId;
const modelRoleId = process.env.modelRoleId;
const approvalLogsId = process.env.approvalLogsId;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage the Model Maker role')
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('Give the Model Maker role to someone')
                .addUserOption(option =>
                    option.setName('member')
                        .setDescription('The member to give the role to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                    .setDescription('Why did you give the role?')
                    .setRequired(true)
                    .setMaxLength(500)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove the Model Maker role from someone')
                .addUserOption(option =>
                    option.setName('member')
                        .setDescription('The member to remove the role from')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Why did you remove the role?')
                        .setRequired(true)
                        .setMaxLength(500))),
    async execute(interaction) {
        if (!await interaction.inGuild() || interaction.guild.id != guildId) {
            const validGuild = await interaction.client.guilds.fetch(guildId);
            return await interaction.reply({content:`This command can only be used in **${validGuild.name}**.`, ephemeral: true });
        } else if (!interaction.member.roles.cache.has(qcRoleId)) {
            return await interaction.reply({content:`You do not have permission to manage the Model Maker role. If you want to become a QC, you can apply for the role using the \`/jointeam\` command of the AI HUB bot.`, ephemeral: true });
        }

        const subcommand = await interaction.options.getSubcommand();
        const user = await interaction.options.getUser('member');
        const reason = await interaction.options.getString('reason');

        const member = await interaction.guild.members.fetch(user.id);
        const modelRole = await interaction.guild.roles.fetch(modelRoleId);

        switch (subcommand) {
            case 'give':
                try {
                    if (member.roles.cache.has(modelRoleId)) {
                        return await interaction.reply({content: `<@${member.id}> already has the Model Maker role.`, ephemeral: true});
                    }

                    await member.roles.add(modelRole);
                    await interaction.reply({content: `Model Maker role successfully added to <@${member.id}>`, ephemeral: true});

                    if (approvalLogsId) {
                        const approvalLogsThread = await interaction.guild.channels.fetch(approvalLogsId);
                        await approvalLogsThread.send({ embeds: [new EmbedBuilder().setColor(`e74c3c`).setTitle('Model Maker role given').setDescription(`<@${interaction.user.id}> has manually given the Model Maker role to <@${member.id}>.\n**Reason:** ${reason}`)] });
                    }
                } catch (error) {
                    await interaction.reply({content: `Something went wrong... Please try again and see if it works. If the error still persists, consider pinging <@${myUserId}>.`, ephemeral: true});
                    console.error(`New error report! Occured on ${new Date().toUTCString()} while executing '/${interaction.commandName}'`);
                    console.log(error);
                }
                break;
            case 'remove':
                try {
                    if (!member.roles.cache.has(modelRoleId)) {
                        return await interaction.reply({content: `<@${member.id}> doesn't have the Model Maker role.`, ephemeral: true});
                    }

                    await member.roles.remove(modelRole);
                    await interaction.reply({content: `Model Maker role successfully removed from <@${member.id}>`, ephemeral: true});

                    if (approvalLogsId) {
                        const approvalLogsThread = await interaction.guild.channels.fetch(approvalLogsId);
                        await approvalLogsThread.send({ embeds: [new EmbedBuilder().setColor(`e74c3c`).setTitle('Model Maker role removed').setDescription(`<@${interaction.user.id}> has manually removed the Model Maker role from <@${member.id}>.\n**Reason:** ${reason}`)] });
                    }
                } catch (error) {
                    await interaction.reply({content: `Something went wrong... Please try again and see if it works. If the error still persists, consider pinging <@${myUserId}>.`, ephemeral: true});
                    console.error(`New error report! Occured on ${new Date().toUTCString()} while executing '/${interaction.commandName}'`);
                    console.log(error);
                }
                break;
        }
    }
};
