// ================= [ 🌐 سيرفر وهمي مصحح لمنع الـ Timeout في Render 🌐 ] =================
const http = require('http');
http.createServer((req, res) => { 
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write("EMS Bot is Online!"); 
    res.end(); 
}).listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log("🌐 Web server is running perfectly for Render port binding.");
});
// ===================================================================================

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, StringSelectMenuBuilder, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js'); 
const fs = require('fs'); 
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates 
    ]
});

const POINTS_FILE = './points.json';

function getPointsData() {
    if (!fs.existsSync(POINTS_FILE)) fs.writeFileSync(POINTS_FILE, JSON.stringify({ points: {}, warnings: {}, duty_hours: {}, dispatch_duty_hours: {}, custom_zones: [] }));
    let data;
    try { data = JSON.parse(fs.readFileSync(POINTS_FILE, 'utf-8')); } catch (e) { data = {}; }
    if (!data.points) data.points = {};
    if (!data.warnings) data.warnings = {};
    if (!data.duty_hours) data.duty_hours = {}; 
    if (!data.dispatch_duty_hours) data.dispatch_duty_hours = {}; 
    if (!data.custom_zones) data.custom_zones = ["Zone 1", "Zone 2", "Zone 3", "Zone 4"];
    return data;
}

function savePointsData(data) {
    fs.writeFileSync(POINTS_FILE, JSON.stringify(data, null, 4));
}

const activeDuty = new Map();
const activeDispatchDuty = new Map();
const activeActions = new Map();
const securityOtps = new Map(); // لحفظ الرموز الأمنية لكل مسؤول توليدها لحظياً

// ================= [ 🚑 إعدادات الرتب ورومات اللوق بالـ ID 🚑 ] =================
const ROLE_WARN_1 = '1515788388110962768'; 
const ROLE_WARN_2 = '1515788389671108649'; 
const ROLE_WARN_3 = '1515788391449366648'; 

const CHANNEL_WELCOME_LOG = '1515788540116467972'; 
const CHANNEL_APPLY_LOG = '1518097965120491652'; 
const LOG_DUTY_CHANNEL = '1515788579199123506'; 

const DISPATCH_CONTROL_CHANNEL = '1519907806356967575'; 
const ACTIVE_DISPATCH_CHANNEL = '1515788576426819724';  
const LOG_DISPATCH_DUTY_CHANNEL = '1519908274915250288'; 

const CHANNEL_QUESTIONS = '1515788540116467972'; 
const CHANNEL_ADMIN_ANSWERS = '1519907806356967575'; 

const URL_APPLY_PANEL_IMAGE = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 
const URL_ADMIN_PANEL_IMAGE = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 
const URL_DUTY_PANEL_IMAGE  = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 

const LOG_APPLY_DECISION = '1515788660933525686'; 
const LOG_PROMOTION = '1515788614783467780';  
const LOG_DEMOTE = '1515788619586081001';    
const LOG_WARN = '1515788624048685165';      
const LOG_FIRE = '1515788627836277016';          
const LOG_POINTS = '1515788614783467780';    

const ROLE_ACCEPT_2 = '1515788325884006464'; 

const EMS_ROLES = [
    { label: '👨‍⚕️ Professor', value: '1515788314592940253' },
    { label: '👨‍⚕️ Doctor', value: '1515788315909947522' },
    { label: '🥼 Scientist', value: '1515788317365633114' },
    { label: '👨‍⚕️ Trainee Doctor', value: '1515788318556684308' },
    { label: '🚑 Advanced Paramedic', value: '1515788319961911327' },
    { label: '🚑 Paramedic', value: '1515788321203290263' },
    { label: '🩺 AEMT', value: '1515788322495270962' },
    { label: '🩺 Senior EMT', value: '1515788323644244038' },
    { label: '⚕️ EMT', value: '1515788324873306255' },
    { label: '🔰 Student', value: '1515788325884006464' }
];

function createDutyEmbed(guild) {
    const today = new Date();
    const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    let activeStaffList = ""; let count = 1;
    activeDuty.forEach((data, userId) => {
        activeStaffList += `**${count}.** <@${userId}> | وقت التحضير: <t:${Math.floor(data.startTime / 1000)}:t> ${data.isAfk ? '⚠️ (خامل/خارج الصوت)' : '🟢 (نشط بالصوت)'}\n`;
        count++;
    });
    if (activeStaffList === "") activeStaffList = "*لا يوجد موظفين في الخدمة حالياً.*";
    const embed = new EmbedBuilder().setTitle('سجل التحضير اليومي').setDescription(`### **ملخص التحضير**\n**التاريخ:** \`${dateString}\`\n**عدد المتواجدين:** \`${activeDuty.size}\`\n\n---\n### **قائمة المتواجدين**\n${activeStaffList}`).setColor('#1c1c1c').setFooter({ text: 'نظام التحضير اليومي المتطور' });
    if (URL_DUTY_PANEL_IMAGE && URL_DUTY_PANEL_IMAGE.startsWith('http')) embed.setImage(URL_DUTY_PANEL_IMAGE);
    return embed;
}

// ================= [ 🛠️ تسجيل الـ Slash Commands تلقائياً 🛠️ ] =================
client.on('ready', async () => {
    console.log(`✅ البوت جاهز ومصحح بالكامل: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('points').setDescription('📊 استعلام عن رصيد نقاط موظف معين').addUserOption(opt => opt.setName('user').setDescription('الموظف المستهدف').setRequired(false)),
        new SlashCommandBuilder().setName('duty-check').setDescription('⏱️ استعلام عن إجمالي ساعات عمل موظف').addUserOption(opt => opt.setName('user').setDescription('الموظف المستهدف').setRequired(false)),
        new SlashCommandBuilder().setName('setup-duty').setDescription('🛠️ إرسال لوحة التحضير والدخول والخروج الرسمية').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('setup-dispatch').setDescription('🚑 إرسال لوحة عمليات الدسباتش وتوزيع المناطق الديناميكية').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('setup-apply').setDescription('📝 إرسال بنل تقديم طلبات الانضمام لقطاع الصحة').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('add-zone').setDescription('➕ إضافة منطقة جديدة للوحة الدسباتش بدون تعديل الكود').addStringOption(opt => opt.setName('name').setDescription('اسم المنطقة الجديدة').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('remove-zone').setDescription('🗑️ حذف منطقة من لوحة الدسباتش').addStringOption(opt => opt.setName('name').setDescription('اسم المنطقة المراد حذفها').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('🚀 تم تسجيل الـ Slash Commands بنجاح.');
    } catch (error) { console.error(error); }

    // Backup تلقائي كل 24 ساعة
    setInterval(async () => {
        const logChannel = client.channels.cache.get(LOG_DUTY_CHANNEL);
        if (logChannel && fs.existsSync(POINTS_FILE)) {
            await logChannel.send({ content: '💾 **نسخة احتياطية تلقائية لنظام البيانات (Automated 24h Backup):**', files: [POINTS_FILE] }).catch(console.error);
        }
    }, 1000 * 60 * 60 * 24);

    // مراقبة الـ Voice AFK
    setInterval(() => {
        activeDuty.forEach(async (data, userId) => {
            const guild = client.guilds.cache.first(); if (!guild) return;
            const member = await guild.members.fetch(userId).catch(() => null);
            const isNoVoice = !member?.voice?.channelId;
            const isMutedAndDeaf = member?.voice?.selfMute && member?.voice?.selfDeafen;

            if (isNoVoice || isMutedAndDeaf) {
                data.afkMinutes += 1; data.isAfk = true;
                if (data.afkMinutes >= 20) { 
                    activeDuty.delete(userId);
                    const diffMins = Math.floor((Date.now() - data.startTime) / 60000) - 20;
                    if (diffMins > 0) {
                        const allData = getPointsData();
                        allData.duty_hours[userId] = (allData.duty_hours[userId] || 0) + diffMins;
                        savePointsData(allData);
                    }
                    const logChannel = guild.channels.cache.get(LOG_DUTY_CHANNEL);
                    if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('⚠️ خروج تلقائي (Anti-AFK)').setDescription(`تم تسجيل خروج ${member} بسبب الخمول خارج الصوت لأكثر من 20 دقيقة.`).setColor('#e67e22').setTimestamp()] });
                    await member.send(`⚠️ تنبيه: تم تسجيل خروجك تلقائياً من الخدمة بسبب بقائك خاملاً خارج قنوات الصوت لـ 20 دقيقة.`).catch(() => null);
                }
            } else { data.afkMinutes = 0; data.isAfk = false; }
        });
    }, 60000);
});

// نظام روم الأسئلة questions
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channelId === CHANNEL_QUESTIONS) {
        const questionText = message.content.trim(); if (!questionText) return;
        await message.delete().catch(() => null);
        const adminChannel = message.guild.channels.cache.get(CHANNEL_ADMIN_ANSWERS);
        if (!adminChannel) return message.author.send("❌ خطأ بالروم الإداري.").catch(() => null);

        const qEmbed = new EmbedBuilder().setTitle('❓ سؤال جديد يحتاج إلى إجابة').addFields({ name: '👤 المرسل:', value: `${message.author}`, inline: true }, { name: '💬 نص السؤال:', value: `\`\`\`text\n${questionText}\n\`\`\`` }).setColor('#f1c40f').setTimestamp();
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`answer_question_btn_${message.author.id}`).setLabel('📝 الإجابة على السؤال').setStyle(ButtonStyle.Primary));
        await adminChannel.send({ embeds: [qEmbed], components: [row] });
        return message.author.send(`✅ تم استلام سؤالك بنجاح وجاري مراجعته، سيصلك الجواب هنا بالخاص فوراً.`).catch(() => null);
    }
});

// معالجة الأوامر المائلة Slash Commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'points') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const allData = getPointsData();
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📊 السجل الرقمي لنقاط الموظف').setDescription(`الموظف: <@${targetUser.id}>\n✨ رصيد النقاط: **${allData.points[targetUser.id] || 0}** نقطة`).setColor('#3498db')] });
    }
    if (commandName === 'duty-check') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const allData = getPointsData(); const totalMinutes = allData.duty_hours[targetUser.id] || 0;
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⏱️ سجل ساعات العمل للموظف').setDescription(`الموظف: <@${targetUser.id}>\n⏳ الوقت المسجل: **${Math.floor(totalMinutes / 60)}** ساعة و **${totalMinutes % 60}** دقيقة`).setColor('#2ecc71')] });
    }
    if (commandName === 'setup-duty') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('duty_on_btn').setLabel('دخول الخدمة 🟢').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('duty_off_btn').setLabel('خروج من الخدمة 🔴').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('admin_panel_shortcut').setLabel('Affairs Options ⚙️').setStyle(ButtonStyle.Primary));
        await interaction.channel.send({ embeds: [createDutyEmbed(interaction.guild)], components: [row] });
        return interaction.reply({ content: '✅ تم إرسال لوحة التحضير بنجاح.', ephemeral: true });
    }
    if (commandName === 'setup-dispatch') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('dispatch_duty_on').setLabel('دخول فترة دسباتش 🟢').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('dispatch_duty_off').setLabel('خروج فترة دسباتش 🔴').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('open_dispatch_modal').setLabel('توزيع الـ Zones الذكي 🗺️').setStyle(ButtonStyle.Primary));
        await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('🚑 مركز عمليات قطاع الصحة | Medical Dispatch Panel').setDescription('استخدم الأزرار أدناه لإدارة فترة الدسباتش وتوزيع الـ Zones ديناميكياً.').setColor('#e74c3c')], components: [row] });
        return interaction.reply({ content: '✅ تم إرسال لوحة الدسباتش بنجاح.', ephemeral: true });
    }
    if (commandName === 'setup-apply') {
        const embed = new EmbedBuilder().setTitle('🚑 التقديم على وزارة الصحة (EMS) 🚑').setDescription('اضغط على الزر أدناه لتعبئة استمارة الانضمام الإلكترونية بالكامل.').setColor('#e74c3c');
        if (URL_APPLY_PANEL_IMAGE && URL_APPLY_PANEL_IMAGE.startsWith('http')) embed.setImage(URL_APPLY_PANEL_IMAGE);
        await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ems_apply_btn').setLabel('تقديم الآن 📝').setStyle(ButtonStyle.Danger))] });
        return interaction.reply({ content: '✅ تم إرسال لوحة التقديم بنجاح.', ephemeral: true });
    }
    if (commandName === 'add-zone') {
        const zoneName = interaction.options.getString('name'); const allData = getPointsData();
        if (allData.custom_zones.includes(zoneName)) return interaction.reply({ content: '⚠️ موجودة بالفعل!', ephemeral: true });
        if (allData.custom_zones.length >= 5) return interaction.reply({ content: '⚠️ الحد الأقصى 5 مناطق فقط.', ephemeral: true });
        allData.custom_zones.push(zoneName); savePointsData(allData);
        return interaction.reply({ content: `✅ تم إضافة **[ ${zoneName} ]** بنجاح للوحة الدسباتش!` });
    }
    if (commandName === 'remove-zone') {
        const zoneName = interaction.options.getString('name'); const allData = getPointsData();
        if (!allData.custom_zones.includes(zoneName)) return interaction.reply({ content: '❌ غير موجودة.', ephemeral: true });
        allData.custom_zones = allData.custom_zones.filter(z => z !== zoneName); savePointsData(allData);
        return interaction.reply({ content: `🗑️ تم حذف المنطقة **[ ${zoneName} ]** بنجاح.` });
    }
});

// ================= [ معالجة الـ Buttons والـ Modals بدون تداخل أو كراش ] =================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const { customId, user, guild } = interaction;

        if (customId.startsWith('answer_question_btn_')) {
            const applicantId = customId.replace('answer_question_btn_', '');
            const modal = new ModalBuilder().setCustomId(`modal_answer_submit_${applicantId}`).setTitle('📝 الإجابة على السؤال');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('answer_text_input').setLabel('اكتب تفاصيل الإجابة بوضوح هنا:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId === 'duty_on_btn') {
            if (activeDuty.has(user.id)) return interaction.reply({ content: '⚠️ مسجل دخول مسبقاً!', ephemeral: true });
            activeDuty.set(user.id, { startTime: Date.now(), afkMinutes: 0, isAfk: false });
            await interaction.message.edit({ embeds: [createDutyEmbed(guild)] });
            const logChannel = guild.channels.cache.get(LOG_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🟢 تسجيل دخول موظف (On Duty)').setDescription(`🚑 الموظف: ${user}\n⏰ التوقيت: <t:${Math.floor(Date.now() / 1000)}:F>`).setColor('#2ecc71')] });
            return interaction.reply({ content: '🟢 تم تسجيل دخولك بنجاح! التواجد بالصوت إلزامي لمنع نظام الطرد التلقائي للاستعراض الوهمي.', ephemeral: true });
        }

        if (customId === 'duty_off_btn') {
            if (!activeDuty.has(user.id)) return interaction.reply({ content: '⚠️ أنت لست مسجلاً بالخدمة!', ephemeral: true });
            const data = activeDuty.get(user.id); activeDuty.delete(user.id);
            await interaction.message.edit({ embeds: [createDutyEmbed(guild)] });
            const diffMins = Math.floor((Date.now() - data.startTime) / 60000);
            const allData = getPointsData(); allData.duty_hours[user.id] = (allData.duty_hours[user.id] || 0) + diffMins; savePointsData(allData);
            const logChannel = guild.channels.cache.get(LOG_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🔴 تسجيل خروج موظف (Off Duty)').setDescription(`🚑 الموظف: ${user}\n⏳ مدة المناوبة: **${Math.floor(diffMins / 60)}** ساعة و **${diffMins % 60}** دقيقة`).setColor('#e74c3c')] });
            return interaction.reply({ content: `🔴 تم تسجيل خروجك بنجاح.`, ephemeral: true });
        }

        if (customId === 'dispatch_duty_on') {
            if (activeDispatchDuty.has(user.id)) return interaction.reply({ content: '⚠️ مسجل دخول مسبقاً!', ephemeral: true });
            activeDispatchDuty.set(user.id, Date.now());
            const logChannel = guild.channels.cache.get(LOG_DISPATCH_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🟢 بدء فترة دسباتش').setDescription(`👮 المسؤول: ${user}`).setColor('#2ecc71')] });
            return interaction.reply({ content: '🟢 تم بدء فترة الدسباتش بنجاح!', ephemeral: true });
        }

        if (customId === 'dispatch_duty_off') {
            if (!activeDispatchDuty.has(user.id)) return interaction.reply({ content: '⚠️ أنت لست مسجلاً بالخدمة!', ephemeral: true });
            const startTime = activeDispatchDuty.get(user.id); activeDispatchDuty.delete(user.id);
            const diffMins = Math.floor((Date.now() - startTime) / 60000);
            const allData = getPointsData(); allData.dispatch_duty_hours[user.id] = (allData.dispatch_duty_hours[user.id] || 0) + diffMins; savePointsData(allData);
            const logChannel = guild.channels.cache.get(LOG_DISPATCH_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🔴 انتهاء فترة دسباتش').setDescription(`👮 المسؤول: ${user}\n⏳ المستغرق: **${Math.floor(diffMins / 60)}** ساعة`).setColor('#e74c3c')] });
            return interaction.reply({ content: `🔴 تم إنهاء شفت الدسباتش بنجاح.`, ephemeral: true });
        }

        if (customId === 'open_dispatch_modal') {
            if (!activeDispatchDuty.has(user.id)) return interaction.reply({ content: '❌ يجب عليك تسجيل دخول فترة الدسباتش أولاً!', ephemeral: true });
            const currentStaffIds = Array.from(activeDuty.keys());
            if (currentStaffIds.length === 0) return interaction.reply({ content: '⚠️ لا يوجد أي موظف مسجل دخول (On Duty) لتوزيعه!', ephemeral: true });
            const staffOptions = [];
            for (const staffId of currentStaffIds) {
                const member = await guild.members.fetch(staffId).catch(() => null);
                if (member) staffOptions.push({ label: member.displayName || member.user.username, value: staffId, description: `الـ ID: ${staffId}` });
            }
            staffOptions.push({ label: '❌ لا يوجد موظف متاح لهذه المنطقة', value: 'empty_zone', description: 'إبقاء المنطقة شاغرة مؤقتاً' });
            const allData = getPointsData(); const currentZones = allData.custom_zones;
            if (currentZones.length === 0) return interaction.reply({ content: '⚠️ اللوحة فارغة، لا توجد مناطق مضافة.', ephemeral: true });
            
            const setupEmbed = new EmbedBuilder().setTitle('🗺️ لوحة توزيع المناطق الطبية الديناميكية').setDescription(`قم بتحديد الموظف لكل منطقة من القوائم أدناه.`).setColor('#3498db').setTimestamp();
            const rows = []; const initialSessionZones = {};
            currentZones.forEach((zoneName, index) => {
                initialSessionZones[`zone_${index}`] = null; 
                rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`dispatch_dyn_zone_${index}`).setPlaceholder(`اختر موظف لـ ( ${zoneName} )...`).addOptions(staffOptions)));
            });
            if (!client.dispatchSessions) client.dispatchSessions = new Map();
            client.dispatchSessions.set(user.id, { selections: initialSessionZones, zonesNames: currentZones });
            await interaction.reply({ embeds: [setupEmbed], components: rows, ephemeral: true });
        }

        if (customId === 'ems_apply_btn') {
            const modal = new ModalBuilder().setCustomId('ems_apply_modal').setTitle('استمارة الانضمام لقطاع الصحة');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apply_name').setLabel("الاسم الثلاثي:").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apply_age').setLabel("العمر والفل الحقيقي:").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apply_exp').setLabel("هل لديك خبرة سابقة في قطاع الصحة؟").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apply_hours').setLabel("عدد الساعات المتوقعة للتواجد يومياً:").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        if (customId.startsWith('app_')) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ ليس لديك صلاحية اتخاذ القرار في التقديمات.', ephemeral: true });
            const [, action, applicantId] = customId.split('_'); const applicant = await guild.members.fetch(applicantId).catch(() => null);
            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed).addFields({ name: '📢 قرار الإدارة:', value: action === 'accept' ? `🟢 تم القبول بواسطة ${user}` : `🔴 تم الرفض بواسطة ${user}` });
            await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
            const decisionChannel = guild.channels.cache.get(LOG_APPLY_DECISION);
            if (action === 'accept') {
                if (applicant) {
                    if (ROLE_ACCEPT_2.length > 5) await applicant.roles.add(ROLE_ACCEPT_2).catch(() => null);
                    await applicant.send(`🎉 تهانينا! تم قبول طلب انضمامك لقطاع الصحة (EMS).`).catch(() => null);
                }
                if (decisionChannel) await decisionChannel.send({ content: `🟢 تم قبول العضو <@${applicantId}> بواسطة الإداري ${user}` });
            } else {
                if (applicant) await applicant.send(`للأسف، تم رفض طلب انضمامك لقطاع الصحة حالياً.`).catch(() => null);
                if (decisionChannel) await decisionChannel.send({ content: `🔴 تم رفض العضو <@${applicantId}> بواسطة الإداري ${user}` });
            }
            return interaction.reply({ content: `✅ تم تسجيل القرار بنجاح.`, ephemeral: true });
        }

        if (customId === 'admin_panel_shortcut') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ هذا الزر مخصص لإدارة شؤون الموظفين فقط.', ephemeral: true });
            const embed = new EmbedBuilder().setTitle('⚙️ لوحة تحكم إدارة قطاع الصحة السريعة ⚙️').setDescription('اختر الإجراء الإداري المطلوب لتنفيذه وتوثيقه فوراً:').setColor('#2c3e50');
            const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('admin_promote').setLabel('ترقية موظف 📈').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('admin_demote').setLabel('كسر رتبة 📉').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('admin_warn').setLabel('تحذير موظف ⚠️').setStyle(ButtonStyle.Danger));
            const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('admin_points_add').setLabel('إضافة نقاط ➕').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('admin_points_remove').setLabel('سحب نقاط ➖').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('admin_points_check').setLabel('ساعات ونقاط الموظف 🔍').setStyle(ButtonStyle.Primary));
            const row3 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('admin_force_on').setLabel('تسجيل دخول لموظف 🟢').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('admin_force_off').setLabel('تسجيل خروج لموظف 🔴').setStyle(ButtonStyle.Danger));
            await interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
        }

        // الأزرار الإدارية المباشرة (فتح نافذة إدخال البيانات المدمج بها الـ OTP الأمني منعاً للـ Crash)
        if (customId.startsWith('admin_') && customId !== 'admin_panel_shortcut') {
            const actionType = customId.split('_')[1];

            if (actionType === 'promote' || actionType === 'demote') {
                const modal = new ModalBuilder().setCustomId(`modal_getid_${actionType}`).setTitle(actionType === 'promote' ? "📈 ترقية موظف" : "📉 كسر رتبة موظف");
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("ID الموظف المستهدف:").setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }
            if (customId === 'admin_points_check') {
                const modal = new ModalBuilder().setCustomId('modal_points_check').setTitle('🔍 استعلام سريع عن ملف موظف');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("ادخل ID الموظف للمعاينة:").setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }
            if (customId === 'admin_points_add') {
                const modal = new ModalBuilder().setCustomId(`modal_direct_admin_points_add`).setTitle("➕ إضافة نقاط إنتاجية");
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("ID الموظف المستهدف:").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason_value').setLabel("عدد النقاط (أرقام فقط):").setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }
            if (customId === 'admin_force_on' || customId === 'admin_force_off') {
                const isLogin = customId === 'admin_force_on';
                const modal = new ModalBuilder().setCustomId(isLogin ? 'modal_force_login' : 'modal_force_logout').setTitle(isLogin ? '🟢 تسجيل دخول بالنيابة' : '🔴 تسجيل خروج بالنيابة');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_staff_id').setLabel('أدخل ID الموظف المستهدف:').setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }

            // هنا توليد الرمز وتمريره داخل نفس النافذة بشكل مباشر وذكي
            if (actionType === 'warn' || actionType === 'fire' || customId.includes('remove')) {
                const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
                securityOtps.set(user.id, otpCode); // حفظ الرمز لمطابقته لاحقاً

                let title = actionType === 'warn' ? '⚠️ تحذير موظف صحة' : (actionType === 'fire' ? '❌ قرار فصل رسمي' : '➖ سحب نقاط وعقوبة');
                let label2 = actionType.includes('points') ? 'عدد النقاط المراد سحبها:' : 'السبب الحقيقي للقرار:';

                const unifiedModal = new ModalBuilder().setCustomId(`modal_direct_${customId}`).setTitle(title);
                unifiedModal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("ID الموظف المستهدف:").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason_value').setLabel(label2).setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('security_otp_input').setLabel(`اكتب الرمز الأمني الظاهر هنا: [ ${otpCode} ]`).setStyle(TextInputStyle.Short).setRequired(true))
                );
                return await interaction.showModal(unifiedModal);
            }
        }
    }

    // القوائم المنسدلة للدسباتش التلقائي
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dispatch_dyn_zone_')) {
        if (!client.dispatchSessions) client.dispatchSessions = new Map(); const session = client.dispatchSessions.get(interaction.user.id);
        if (!session) return interaction.reply({ content: '❌ انتهت الجلسة الأمنية.', ephemeral: true });
        const selectedValue = interaction.values[0]; const zoneIndex = interaction.customId.replace('dispatch_dyn_zone_', ''); 
        session.selections[`zone_${zoneIndex}`] = selectedValue === 'empty_zone' ? '❌ غـيـر مـتـوفـر' : `<@${selectedValue}>`; client.dispatchSessions.set(interaction.user.id, session);
        const totalRequired = session.zonesNames.length; const totalFilled = Object.values(session.selections).filter(val => val !== null).length;

        if (totalFilled === totalRequired) {
            const activeChannel = interaction.guild.channels.cache.get(ACTIVE_DISPATCH_CHANNEL); if (!activeChannel) return interaction.reply({ content: '❌ الروم غير موجود.', ephemeral: true });
            let zonesReportText = ""; session.zonesNames.forEach((name, index) => { zonesReportText += `🗺️ **${name} :** ${session.selections[`zone_${index}`]}\n`; });
            const formattedMessage = `**:SAMS: | SAN ANDREAS MEDICAL SERVICES .**\n-# :megaphone: Dynamic Medical Dispatch Report .\n\n  أسـم الـديسباتـش  : ${interaction.member}\n  توقيت التوزيع  : <t:${Math.floor(Date.now() / 1000)}:t>\n\n-# **ــــــــــــــــ توزيع المناطق الطبية ــــــــــــــــ**\n${zonesReportText}\n-# إرفاق صورة إلزامي داخل الثريد أدناه\n-# \`[ + ]\` <@&1499850630544621639> .`;
            const sentMessage = await activeChannel.send({ content: formattedMessage });
            try { await sentMessage.startThread({ name: `📸 صورة الفترة - ${interaction.user.username}`, autoArchiveDuration: 60 }); } catch (e) {}
            client.dispatchSessions.delete(interaction.user.id);
            return await interaction.update({ content: '✅ تم إرسال تقرير الدسباتش المطور بنجاح وفُتح ثريد الصور!', embeds: [], components: [], ephemeral: true });
        } else { return await interaction.reply({ content: `📥 تم تسجيل المنطقة بنجاح.`, ephemeral: true }).catch(() => null); }
    }

    // ================= [ استقبال البيانات من الـ Modals والتحقق النهائي ] =================
    if (interaction.isModalSubmit()) {
        const { customId, fields, guild, user } = interaction;

        if (customId.startsWith('modal_answer_submit_')) {
            const targetUserId = customId.replace('modal_answer_submit_', ''); const adminAnswerText = fields.getTextInputValue('answer_text_input');
            const targetUser = await client.users.fetch(targetUserId).catch(() => null); const oldEmbed = interaction.message.embeds[0];
            const originalQuestionField = oldEmbed.fields.find(f => f.name === '💬 نص السؤال:').value;
            if (!targetUser) return interaction.reply({ content: '❌ تعذر العثور على العضو.', ephemeral: true });
            const dmEmbed = new EmbedBuilder().setTitle('✉️ إشعار رسمي: الإجابة على استفسارك').addFields({ name: '📥 سؤالك الأصلي:', value: originalQuestionField }, { name: '🟢 الإجابة والبيان:', value: `\`\`\`text\n${adminAnswerText}\n\`\`\`` }, { name: '👮 المجيب من الإدارة:', value: `${user}` }).setColor('#2ecc71').setTimestamp();
            const success = await targetUser.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false);
            if (!success) return interaction.reply({ content: `❌ الخاص مغلق.`, ephemeral: true });
            await interaction.message.edit({ embeds: [EmbedBuilder.from(oldEmbed).setTitle('✅ تم الإجابة على هذا السؤال').addFields({ name: '📝 الإجابة الموجهة:', value: adminAnswerText }).setColor('#2ecc71')], components: [] });
            return interaction.reply({ content: `✅ تم إرسال الإجابة بنجاح!`, ephemeral: true });
        }

        // شؤون الموظفين - تنفيذ الإجراءات المباشرة مع فحص الرمز الأمني المدمج
        if (customId.startsWith('modal_direct_')) {
            const actionFull = customId.replace('modal_direct_admin_', '');
            const targetId = fields.getTextInputValue('target_id');
            const reasonOrValue = fields.getTextInputValue('reason_value');
            const targetMember = await guild.members.fetch(targetId).catch(() => null);
            if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود بالسيرفر.', ephemeral: true });

            // التحقق من الرمز الأمني المدمج (للقرارات الحساسة فقط)
            if (actionFull === 'warn' || actionFull === 'fire' || actionFull.includes('remove')) {
                const userOtpInput = fields.getTextInputValue('security_otp_input');
                const savedOtp = securityOtps.get(user.id);
                securityOtps.delete(user.id); // مسح الرمز فوراً لتجنب التكرار

                if (!savedOtp || userOtpInput !== savedOtp) {
                    return interaction.reply({ content: '❌ رمز التحقق الأمني الذي أدخلته خاطئ! تم إلغاء الإجراء حماية للنظام.', ephemeral: true });
                }
            }

            let logChannelId = ''; let color = '#ffffff'; let actionTitle = ''; let pointsMessageDetail = '';
            const allData = getPointsData();

            if (actionFull === 'warn') { 
                logChannelId = LOG_WARN; color = '#f1c40f'; 
                const currentWarns = allData.warnings[targetId] || 0; const newWarns = currentWarns + 1;
                allData.warnings[targetId] = newWarns; savePointsData(allData);
                if (newWarns === 1 && ROLE_WARN_1.length > 5) await targetMember.roles.add(ROLE_WARN_1).catch(() => null);
                else if (newWarns === 2) { await targetMember.roles.remove(ROLE_WARN_1).catch(() => null); await targetMember.roles.add(ROLE_WARN_2).catch(() => null); }
                else if (newWarns === 3) { await targetMember.roles.remove(ROLE_WARN_2).catch(() => null); await targetMember.roles.add(ROLE_WARN_3).catch(() => null); }
                actionTitle = `⚠️ توجيه إنذار رسمي [وورن ${newWarns}]`; pointsMessageDetail = `\nالسجل التراكمي: لديه الحين **${newWarns}** تحذيرات.`;
            }
            else if (actionFull === 'fire') { 
                logChannelId = LOG_FIRE; color = '#c0392b'; actionTitle = '❌ قرار فصل رسمي ومسح الصلاحيات كاملة'; 
                const allEmsRoleIds = [ROLE_WARN_1, ROLE_WARN_2, ROLE_WARN_3, ...EMS_ROLES.map(r => r.value)].filter(id => id.length > 5);
                await targetMember.roles.remove(allEmsRoleIds).catch(() => null);
                allData.warnings[targetId] = 0; savePointsData(allData);
            }
            else if (actionFull.startsWith('points')) { 
                logChannelId = LOG_POINTS; color = '#3498db'; const pointsAmount = parseInt(reasonOrValue);
                if (isNaN(pointsAmount) || pointsAmount <= 0) return interaction.reply({ content: '❌ خطأ: أدخل أرقام صحيحة وموجبة.', ephemeral: true });
                const currentPoints = allData.points[targetId] || 0; let newPoints = currentPoints;
                if (actionFull.includes('add')) { newPoints += pointsAmount; actionTitle = `➕ إضافة نقاط إنتاجية (+${pointsAmount})`; } 
                else { newPoints = Math.max(0, currentPoints - pointsAmount); actionTitle = `➖ سحب نقاط وعقوبة (-${pointsAmount})`; }
                allData.points[targetId] = newPoints; savePointsData(allData); 
                pointsMessageDetail = `\n📊 الرصيد الإجمالي الحالي: **${newPoints}** نقطة مسجلة.`;
            }

            const logEmbed = new EmbedBuilder().setTitle(actionTitle).addFields({ name: '👮 المسؤول:', value: `${user}`, inline: true }, { name: '🚑 المستهدف:', value: `${targetMember}`, inline: true }, { name: '📝 التفاصيل والسبب:', value: reasonOrValue }).setDescription(pointsMessageDetail || null).setColor(color).setTimestamp();
            const logChannel = guild.channels.cache.get(logChannelId); if (logChannel) await logChannel.send({ embeds: [logEmbed] });
            await targetMember.send(`✉️ إشعار رسمي:\nالإجراء: **${actionTitle}**\nالسبب: ${reasonOrValue}`).catch(() => null);
            return interaction.reply({ content: `✅ تم تنفيذ الإجراء بنجاح وتحديث نظام البيانات واللوغات!`, ephemeral: true });
        }

        if (customId === 'modal_force_login') {
            const targetId = fields.getTextInputValue('target_staff_id'); const targetMember = await guild.members.fetch(targetId).catch(() => null);
            if (!targetMember) return interaction.reply({ content: '❌ تعذر العثور على الموظف.', ephemeral: true });
            if (activeDuty.has(targetId)) return interaction.reply({ content: '⚠️ مسجل دخول مسبقاً!', ephemeral: true });
            activeDuty.set(targetId, { startTime: Date.now(), afkMinutes: 0, isAfk: false });
            const logChannel = guild.channels.cache.get(LOG_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🟢 تسجيل دخول إداري بالنيابة').addFields({ name: '🚑 الموظف:', value: `${targetMember}` }, { name: '👮 المسؤول:', value: `${user}` }).setColor('#2ecc71').setTimestamp()] });
            return interaction.reply({ content: `✅ تم تسجيل دخول الموظف بنجاح!`, ephemeral: true });
        }

        if (customId === 'modal_force_logout') {
            const targetId = fields.getTextInputValue('target_staff_id'); const targetMember = await guild.members.fetch(targetId).catch(() => null);
            if (!targetMember || !activeDuty.has(targetId)) return interaction.reply({ content: '❌ غير مسجل بالخدمة حالياً.', ephemeral: true });
            const data = activeDuty.get(targetId); activeDuty.delete(targetId);
            const diffMins = Math.floor((Date.now() - data.startTime) / 60000);
            const allData = getPointsData(); allData.duty_hours[targetId] = (allData.duty_hours[targetId] || 0) + diffMins; savePointsData(allData);
            const logChannel = guild.channels.cache.get(LOG_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🔴 تسجيل خروج إداري بالنيابة').addFields({ name: '🚑 الموظف:', value: `${targetMember}` }, { name: '👮 المسؤول:', value: `${user}` }, { name: '⏰ مدة المناوبة:', value: `**${Math.floor(diffMins / 60)}** ساعة` }).setColor('#e74c3c').setTimestamp()] });
            return interaction.reply({ content: `✅ تم تسجيل خروج الموظف وحفظ ساعاته بنجاح.`, ephemeral: true });
        }
    }
});

client.on('error', console.error);
client.login(process.env.BOT_TOKEN);
