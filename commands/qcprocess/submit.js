const { SlashCommandBuilder } = require('discord.js');
const { SubmissionsTable } = require('../../sequelcode');
const { bannedWords } = require('../../wordCheckFunction');
const wait = require('node:timers/promises').setTimeout;
const env = require('dotenv').config();
const myUserId = process.env.myUserId;
const guildId = process.env.guildId;
const qcChannelId = process.env.qcChannelId;
const modelRoleId = process.env.modelRoleId;
const modelsChannelId = process.env.modelsChannelId;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submit')
		.setDescription('Submit your model for validation to get the Model Maker role')
        .addStringOption(option =>
            option.setName('modelname')
                .setDescription('The name of your model')
                .setRequired(true)
                .setMaxLength(100))
        .addStringOption(option =>
            option.setName('rvc')
                .setDescription('The RVC version used for training (v1 or v2)')
                .setRequired(true)
                .addChoices(
                    { name: 'v1', value: 'v1' },
                    { name: 'v2', value: 'v2' },
                ))
        .addStringOption(option =>
            option.setName('extraction')
                .setDescription('The extraction method used for training')
                .setRequired(true)
                .addChoices(
                    { name: 'pm', value: 'pm' },
                    { name: 'harvest', value: 'harvest' },
                    { name: 'dio', value: 'dio' },
                    { name: 'crepe', value: 'crepe' },
                    { name: 'mangio-crepe', value: 'mangio-crepe' },
                    { name: 'rmvpe', value: 'rmvpe' },
                ))
        .addIntegerOption(option =>
            option.setName('epochs')
                .setDescription('The number of epochs of your model')
                .setRequired(true)
                .setMaxValue(100000))
        .addStringOption(option =>
            option.setName('link')
                .setDescription('The link of your model (Huggingface only!)')
                .setRequired(true)
                .setMaxLength(150))
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('An image for your model')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('demo')
                .setDescription('An audio file containing a demo of your model')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('note')
                .setDescription('Anything else?')
                .setMaxLength(500)),
	async execute(interaction) {
        if (!await interaction.inGuild() || interaction.guild.id != guildId) {
            const validGuild = await interaction.client.guilds.fetch(guildId)
            return await interaction.reply({content:`This command can only be used in **${validGuild.name}**.`, ephemeral: true });
        } else if (interaction.channel.id != qcChannelId) {
            return await interaction.reply({content:`This command can only be used in the https://discord.com/channels/${guildId}/${qcChannelId} channel.`, ephemeral: true });
        } else if (await interaction.member.roles.cache.has(modelRoleId)) {
            return await interaction.reply({content:`You already have the Model Maker role. You can post your models in the https://discord.com/channels/${guildId}/${modelsChannelId} channel.`, ephemeral: true });
        }

        const name = await interaction.options.getString('modelname');
		const rvc = await interaction.options.getString('rvc');
        const extraction = await interaction.options.getString('extraction');
		const epochs = await interaction.options.getInteger('epochs');
		const link = await interaction.options.getString('link');
        const note = await interaction.options.getString('note') ?? 'N/A';
        const userId = interaction.user.id;
        const image = await interaction.options.getAttachment('image');
        const demo = await interaction.options.getAttachment('demo');

        let dbUserIdList = []
        const dbUserIdRaw = await SubmissionsTable.findAll({ attributes: ['dbUserId'] });
        dbUserIdList.push(...dbUserIdRaw.map((tag) => tag.dbUserId));

        if (dbUserIdList.includes(userId)) {
            const rowFromUserTag = await SubmissionsTable.findOne({ where: { dbUserId: userId } });
            const submissionIdFromUserTag = rowFromUserTag.get('dbSubmissionId');
            return await interaction.reply({content:`There's already a submission from you in the queue (ID: ${submissionIdFromUserTag}). Please note that you only need to submit your model once.\nIf you want to, you can check your submission's number in queue using \`/queue\` or cancel it using \`/cancel\`.`, ephemeral: true });
        }

        const nameCheck = name.toLowerCase();
        const linkCheck = link.toLowerCase();
        const noteCheck = note.toLowerCase();

        for (const word of bannedWords) {
            if (nameCheck.includes(word)) {
                return await interaction.reply({content:`Your submission contains a banned word. Unable to proceed.`, ephemeral: true });
            } else if (linkCheck.includes(word)) {
                return await interaction.reply({content:`Your submission contains a banned word. Unable to proceed.`, ephemeral: true });
            } else if (noteCheck.includes(word)) {
                return await interaction.reply({content:`Your submission contains a banned word. Unable to proceed.`, ephemeral: true });
            }
        }

        if (link.includes('https://huggingface.co/')) {
            if (link.includes('/blob/')) {
                return await interaction.reply({content:`Invalid Huggingface link. Please make sure to get the "resolve" link and not the "blob" one. Follow this tutorial to make sure you get the correct Huggingface link: <https://rentry.org/fdg_guide_newer>.`, ephemeral: true });
            } else if (!link.includes('/resolve/')) {
                return await interaction.reply({content:`Invalid Huggingface link. Your link must be a "resolve" one. Follow this tutorial to make sure you get the correct Huggingface link: <https://rentry.org/fdg_guide_newer>.`, ephemeral: true });
            }
        } else if (link.includes('https://drive.google.com/') || link.includes('https://mega.nz/')) {
            return await interaction.reply({content:`Looks like you entered a Google Drive / Mega link. Please note that all models are required to have a Huggingface link. Follow this tutorial to make sure you get the correct Huggingface link: <https://rentry.org/fdg_guide_newer>.`, ephemeral: true });
        } else {
            return await interaction.reply({content:`Invalid link. Please note that all models are required to have a Huggingface link. Follow this tutorial to make sure you get the correct Huggingface link: <https://rentry.org/fdg_guide_newer>.\nPlease note that we do not accept Kits.ai models anymore.`, ephemeral: true });
        }

        if (extraction=='pm' || extraction=='harvest' || extraction=='dio') {
            return await interaction.reply({content:`Sorry, outdated extraction algorithms such as *${extraction}* aren't accepted anymore.\nYou may retrain the model with a more recent one (e.g. rmvpe or crepe) and reapply.`, ephemeral: true });
        }

        const imageType = image.contentType.toLowerCase();
        const demoType = demo.contentType.toLowerCase();
        const imageSize = image.size
        const demoSize = demo.size

        if (!imageType.includes('png') && !imageType.includes('jpeg') && !imageType.includes('gif') && !imageType.includes('webp')) {
            return await interaction.reply({content:`Invalid file type for "image". Please attach a file with a supported extension. Supported file types: png, jpg, jpeg, gif, webp.`, ephemeral: true });
        } else if (!demoType.includes('wav') && !demoType.includes('flac') && !demoType.includes('mpeg') && !demoType.includes('mp4') && !demoType.includes('ogg')) {
            return await interaction.reply({content:`Invalid file type for "demo". Please attach a file with a supported extension. Supported file types: wav, flac, mp3, m4a, ogg.`, ephemeral: true });
        }

        if (imageSize>=25_000_000) {
            return await interaction.reply({content:`Invalid file size for "image". Please attach a file that's under 25 MB.`, ephemeral: true });
        } else if (demoSize>=25_000_000) {
            return await interaction.reply({content:`Invalid file size for "demo". Please attach a file that's under 25 MB.`, ephemeral: true });
        }

        const botResponse = await interaction.reply(`<@${interaction.user.id}> Your submission is being processed... Please wait...`);
        const submissionLink = `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${botResponse.id}`

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        let submissionId = getRandomInt(1, 999);
        let state = 0
        let dbSubmissionsIdList = []

        const dbSubmissionsIdRaw = await SubmissionsTable.findAll({ attributes: ['dbSubmissionId'] });
        dbSubmissionsIdList.push(...dbSubmissionsIdRaw.map((tag) => tag.dbSubmissionId));

        while (state == 0) {
            if (dbSubmissionsIdList.includes(submissionId)) {
                submissionId = getRandomInt(1, 999)
            } else {
                state = 1;
            }
        }

        try {
			await SubmissionsTable.create({
				dbSubmissionId: submissionId,
				dbUserId: userId,
				dbSubmissionLink: submissionLink,
			});

            await interaction.editReply({content:`<@${interaction.user.id}> Your model has been successfully submitted with infos:\n**Name:** ${name}\n**RVC:** ${rvc}\n**Extraction type:** ${extraction}\n**Number of epochs:** ${epochs}\n**Link:** <${link}>\n**Note:** ${note}\n**Your submission ID:** ${submissionId}\nPlease wait until a QC reviews your model. You'll be notified once it has been reviewed.`, files:[image, demo]});
		} catch (error) {
			const errorResponse = await interaction.editReply({content: `Something went wrong... Please try again and see if it works. If the error still persists, consider pinging <@${myUserId}>.\nThis message will disappear in 30 seconds.`, allowedMentions:{parse: []}});
            
            console.error(`New error report! Occured on ${new Date().toUTCString()} while executing '/${interaction.commandName}'`);
            console.log(error);
            
            await wait(30_000);
            await errorResponse.delete();
		}
	}
};
