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

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js'); 
const fs = require('fs'); 
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers 
    ]
});

const PREFIX = '!';
const POINTS_FILE = './points.json';

// دالة جلب البيانات المحدثة لدعم النقاط، التحذيرات، وساعات العمل
function getPointsData() {
    if (!fs.existsSync(POINTS_FILE)) fs.writeFileSync(POINTS_FILE, JSON.stringify({ points: {}, warnings: {}, duty_hours: {}, dispatch_duty_hours: {} }));
    let data;
    try {
        data = JSON.parse(fs.readFileSync(POINTS_FILE, 'utf-8'));
    } catch (e) {
        data = {};
    }
    if (!data.points) data.points = {};
    if (!data.warnings) data.warnings = {};
    if (!data.duty_hours) data.duty_hours = {}; 
    if (!data.dispatch_duty_hours) data.dispatch_duty_hours = {}; 
    return data;
}

function savePointsData(data) {
    fs.writeFileSync(POINTS_FILE, JSON.stringify(data, null, 4));
}

// مابات مؤقتة لحفظ وقت دخول الموظفين الحاليين (أون ديوتي)
const activeDuty = new Map();
const activeDispatchDuty = new Map(); // ماب مخصص لدخول وخروج الدسباتش

// ================= [ 🚑 إعدادات الرتب ورومات اللوق بالـ ID 🚑 ] =================
const ROLE_WARN_1 = '1515788388110962768'; 
const ROLE_WARN_2 = '1515788389671108649'; 
const ROLE_WARN_3 = '1515788391449366648'; 

const CHANNEL_WELCOME_LOG = '1515788540116467972'; 
const CHANNEL_APPLY_LOG = '1518097965120491652'; 
const LOG_DUTY_CHANNEL = '1515788579199123506'; 

// 🚨 رومات نظام الدسباتش واللوق الخاص به 🚨
const DISPATCH_CONTROL_CHANNEL = '1519907806356967575'; 
const ACTIVE_DISPATCH_CHANNEL = '1515788576426819724';  
const LOG_DISPATCH_DUTY_CHANNEL = '1519908274915250288'; 

// 🖼️ روابط الصور المنفصلة الثلاثة وصورة غلاف اللوحة
const URL_APPLY_PANEL_IMAGE = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 
const URL_TICKET_IMAGE      = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 
const URL_ADMIN_PANEL_IMAGE = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 
const URL_DUTY_PANEL_IMAGE  = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; // يمكنك استبدالها بصورة Last State الظاهرة بالصورة

// 📂 رومات اللوغات المنفصلة بالكامل:
const LOG_APPLY_DECISION = '1515788660933525686'; 
const LOG_PROMOTION = '1515788614783467780';  
const LOG_DEMOTE = '1515788619586081001';    
const LOG_WARN = '1515788624048685165';      
const LOG_FIRE = '1515788627836277016';          
const LOG_POINTS = '1515788614783467780';    

const ROLE_ACCEPT_1 = '1515788373912977498'; 
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

// دالة صياغة الإمبيد الخاص بالتحضير اليومي بناءً على المتواجدين حالياً بالخدمة[cite: 1]
function createDutyEmbed(guild) {
    const today = new Date();
    const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    
    let activeStaffList = "";
    let count = 1;
    
    activeDuty.forEach((startTime, userId) => {
        activeStaffList += `**${count}.** <@${userId}> | <t:${Math.floor(startTime / 1000)}:t>\n`;
        count++;
    });

    if (activeStaffList === "") {
        activeStaffList = "*لا يوجد موظفين في الخدمة حالياً.*";
    }

    const embed = new EmbedBuilder()
        .setTitle('سجل التحضير اليومي')
        .setDescription(`### **ملخص التحضير**\n**التاريخ:** \`${dateString}\`\n**عدد المتواجدين:** \`${activeDuty.size}\`\n\n---\n### **قائمة المتواجدين**\n${activeStaffList}`)
        .setColor('#1c1c1c')
        .setFooter({ text: 'نظام التحضير اليومي' });

    if (URL_DUTY_PANEL_IMAGE && URL_DUTY_PANEL_IMAGE.startsWith('http')) {
        embed.setImage(URL_DUTY_PANEL_IMAGE);
    }
    return embed;
}
// ==========================================================================================

client.on('ready', () => {
    console.log(`✅ البوت جاهز، ومفعل نظام الترحيب والديوتي والدسباتش: ${client.user.tag}`);
});

const activeActions = new Map();

client.on('guildMemberAdd', async (member) => {
    const welcomeChannel = member.guild.channels.cache.get(CHANNEL_WELCOME_LOG);
    if (!welcomeChannel) return;

    const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);

    const welcomeEmbed = new EmbedBuilder()
        .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
        .setTitle('welcome to MD | San Andreas Medical Services') 
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 })) 
        .addFields(
            { name: 'Member :', value: `${member}`, inline: false }, 
            { name: 'Create Discord :', value: `<t:${createdTimestamp}:R>`, inline: false }, 
            { name: 'Members :', value: `**${member.guild.memberCount}**`, inline: false } 
        )
        .setColor('#e74c3c') 
        .setFooter({ text: `By Moha` })
        .setTimestamp(); 

    await welcomeChannel.send({ content: `${member}`, embeds: [welcomeEmbed] });
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'points') {
        const targetId = args[0] || message.author.id;
        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return message.reply('❌ تعذر العثور على العضو، يرجى كتابة الـ ID بشكل صحيح.');
        
        const allData = getPointsData();
        const userPoints = allData.points[targetId] || 0;

        const pointsEmbed = new EmbedBuilder()
            .setTitle('📊 السجل الرقمي لنقاط الموظف 📊')
            .setDescription(`الموظف المستعلم عنه: ${targetMember}`)
            .addFields({ name: '✨ رصيد النقاط الحالي المسجل:', value: `**${userPoints}** نقطة` })
            .setColor('#3498db')
            .setTimestamp();

        return message.reply({ embeds: [pointsEmbed] });
    }

    // أمر الـ Setup المحدث بالكامل ليطابق الصورة المرسلة[cite: 1]
    if (command === 'setup-duty') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للادارة العليا فقط.');
        
        const embed = createDutyEmbed(message.guild);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('duty_on_btn').setLabel('دخول').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('duty_off_btn').setLabel('خروج').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('admin_panel_shortcut').setLabel('Affairs Options').setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete();
    }

    if (command === 'duty-check') {
        const targetId = args[0] || message.author.id;
        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return message.reply('❌ تعذر العثور على العضو.');
        
        const allData = getPointsData();
        const totalMinutes = allData.duty_hours[targetId] || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const dutyEmbed = new EmbedBuilder()
            .setTitle('⏱️ سجل ساعات العمل للموظف ⏱️')
            .setDescription(`الموظف المستعلم عنه: ${targetMember}`)
            .addFields({ name: '⏳ إجمالي الوقت المقضي في الخدمة:', value: `**${hours}** ساعة و **${minutes}** دقيقة` })
            .setColor('#2ecc71')
            .setTimestamp();

        return message.reply({ embeds: [dutyEmbed] });
    }

    if (command === 'setup-apply') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للادارة العليا فقط.');
        const embed = new EmbedBuilder()
            .setTitle('🚑 التتقديم على وزارة الصحة (EMS) 🚑')
            .setDescription('مرحباً بك في بوابة التقديم للعمل في الخدمات الطبية الطارئة.\nاضغط على الزر أدناه لتعبئة الاستمارة.')
            .setColor('#e74c3c');
        if (URL_APPLY_PANEL_IMAGE && URL_APPLY_PANEL_IMAGE.startsWith('http')) embed.setImage(URL_APPLY_PANEL_IMAGE);

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ems_apply_btn').setLabel('تقديم الآن 📝').setStyle(ButtonStyle.Danger));
        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete();
    }

    if (command === 'ems-admin') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ ليس لديك صلاحية الوصول للوحة التحكم.');
        const embed = new EmbedBuilder()
            .setTitle('⚙️ لوحة تحكم إدارة قطاع الصحة ⚙️')
            .setDescription('اختر الإجراء الإداري المطلوب لتنفيذه وتوثيقه فوراً:')
            .setColor('#2c3e50')
            .setTimestamp();
        if (URL_ADMIN_PANEL_IMAGE && URL_ADMIN_PANEL_IMAGE.startsWith('http')) embed.setImage(URL_ADMIN_PANEL_IMAGE);

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_promote').setLabel('ترقية موظف 📈').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('admin_demote').setLabel('كسر رتبة 📉').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('admin_warn').setLabel('تحذير موظف ⚠️').setStyle(ButtonStyle.Danger)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_points_add').setLabel('إضافة نقاط ➕').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('admin_points_remove').setLabel('سحب نقاط ➖').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('admin_points_check').setLabel('ساعات ونقاط الموظف 🔍').setStyle(ButtonStyle.Primary), 
            new ButtonBuilder().setCustomId('admin_fire').setLabel('فصل موظف ❌').setStyle(ButtonStyle.Danger)
        );
        await message.channel.send({ embeds: [embed], components: [row1, row2] });
        await message.delete();
    }

    if (command === 'setup-dispatch') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للإدارة العليا فقط.');
        
        const embed = new EmbedBuilder()
            .setTitle('🚑 مركز عمليات قطاع الصحة | Medical Dispatch Panel')
            .setDescription('مرحباً بك في لوحة تحكم نظام الدسباتش الموحدة.\nيرجى استخدام الأزرار أدناه لتسجيل فترتك الحالية، أو لرفع تقرير وتوزيع الـ Zones عند النهاية.\n\n🟢 **دخول فترة دسباتش:** لبدء احتساب وقت الشفت الخاص بك.\n🔴 **خروج فترة دسباتش:** لإنهاء شفتك وحفظ ساعات العمل.\n📝 **تقديم استبيان الدسباتش:** لرفع التقرير النهائي وتوزيع المناطق.')
            .setColor('#e74c3c')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dispatch_duty_on').setLabel('دخول فترة دسباتش 🟢').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('dispatch_duty_off').setLabel('خروج فترة دسباتش 🔴').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('open_dispatch_modal').setLabel('تقديم استبيان الدسباتش 📝').setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete();
    }
});

client.on('interactionCreate', async (interaction) => {
    
    // ================= [ نظام الدخول والخروج - تحديث تفاعلي ] =================
    if (interaction.isButton() && interaction.customId === 'duty_on_btn') {
        if (activeDuty.has(interaction.user.id)) return interaction.reply({ content: '⚠️ أنت مسجل دخولك بالفعل بالخدمة مسبقاً!', ephemeral: true });

        activeDuty.set(interaction.user.id, Date.now());
        
        // تحديث رسالة الإمبيد الأساسية فوراً لتظهر اسم الشخص الجديد المُنضم للقائمة[cite: 1]
        const updatedEmbed = createDutyEmbed(interaction.guild);
        await interaction.message.edit({ embeds: [updatedEmbed] });

        const logChannel = interaction.guild.channels.cache.get(LOG_DUTY_CHANNEL);
        if (logChannel) {
            const loginEmbed = new EmbedBuilder()
                .setTitle('🟢 تسجيل دخول موظف (On Duty)')
                .addFields(
                    { name: '🚑 الموظف:', value: `${interaction.user}`, inline: true },
                    { name: '⏰ وقت الدخول:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setColor('#2ecc71').setTimestamp();
            await logChannel.send({ embeds: [loginEmbed] });
        }
        return interaction.reply({ content: '🟢 تم تسجيل دخولك بنجاح! بالتوفيق في مناوبتك.', ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'duty_off_btn') {
        if (!activeDuty.has(interaction.user.id)) return interaction.reply({ content: '⚠️ أنت لست مسجلاً في الخدمة حالياً ليتم تسجيل خروجك!', ephemeral: true });

        const startTime = activeDuty.get(interaction.user.id);
        const endTime = Date.now();
        const diffMs = endTime - startTime;
        const diffMins = Math.floor(diffMs / 60000); 

        activeDuty.delete(interaction.user.id);

        // تحديث الإمبيد لحذف الشخص من القائمة أمام الجميع[cite: 1]
        const updatedEmbed = createDutyEmbed(interaction.guild);
        await interaction.message.edit({ embeds: [updatedEmbed] });

        const allData = getPointsData();
        const previousMins = allData.duty_hours[interaction.user.id] || 0;
        const totalMins = previousMins + diffMins;
        allData.duty_hours[interaction.user.id] = totalMins;
        savePointsData(allData);

        const hoursDisplay = Math.floor(diffMins / 60);
        const minutesDisplay = diffMins % 60;
        const totalHours = Math.floor(totalMins / 60);
        const totalMinutes = totalMins % 60;

        const logChannel = interaction.guild.channels.cache.get(LOG_DUTY_CHANNEL);
        if (logChannel) {
            const logoutEmbed = new EmbedBuilder()
                .setTitle('🔴 تسجيل خروج موظف (Off Duty)')
                .addFields(
                    { name: '🚑 الموظف:', value: `${interaction.user}`, inline: true },
                    { name: '⏰ مدة هذه المناوبة:', value: `**${hoursDisplay}** ساعة و **${minutesDisplay}** دقيقة`, inline: false },
                    { name: '📊 إجمالي الساعات الكلية:', value: `**${totalHours}** ساعة و **${totalMinutes}** دقيقة`, inline: false }
                )
                .setColor('#e74c3c').setTimestamp();
            await logChannel.send({ embeds: [logoutEmbed] });
        }
        return interaction.reply({ content: `🔴 تم تسجيل خروجك بنجاح. قضيت **${hoursDisplay}** ساعة و **${minutesDisplay}** دقيقة في الخدمة.`, ephemeral: true });
    }

    // اختصار شؤون الموظفين (Affairs Options)[cite: 1]
    if (interaction.isButton() && interaction.customId === 'admin_panel_shortcut') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: '❌ هذا الزر مخصص لإدارة شؤون الموظفين فقط المسؤولة عن قطاع الصحة.', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ لوحة تحكم إدارة قطاع الصحة السريعة ⚙️')
            .setDescription('اختر الإجراء الإداري المطلوب لتنفيذه وتوثيقه فوراً:')
            .setColor('#2c3e50');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_promote').setLabel('ترقية موظف 📈').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('admin_demote').setLabel('كسر رتبة 📉').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('admin_warn').setLabel('تحذير موظف ⚠️').setStyle(ButtonStyle.Danger)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_points_add').setLabel('إضافة نقاط ➕').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('admin_points_remove').setLabel('سحب نقاط ➖').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('admin_points_check').setLabel('ساعات ونقاط الموظف 🔍').setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }

    // ================= [ 🟢 دخول وخروج الدسباتش ] =================
    if (interaction.isButton() && interaction.customId === 'dispatch_duty_on') {
        if (activeDispatchDuty.has(interaction.user.id)) {
            return interaction.reply({ content: '⚠️ أنت مسجل دخول بالفعل كمسؤول دسباتش في الخدمة حالياً!', ephemeral: true });
        }

        activeDispatchDuty.set(interaction.user.id, Date.now());
        
        const logChannel = interaction.guild.channels.cache.get(LOG_DISPATCH_DUTY_CHANNEL);
        if (logChannel) {
            const loginEmbed = new EmbedBuilder()
                .setTitle('📢 [الدسباتش] بدء فترة عمل جديدة')
                .setDescription(`قام موظف العمليات ${interaction.user} ببدء فترة السيطرة وتوزيع البلاغات الحين.`)
                .addFields({ name: '⏰ وقت الدخول:', value: `<t:${Math.floor(Date.now() / 1000)}:F>` })
                .setColor('#2ecc71')
                .setTimestamp();
            await logChannel.send({ embeds: [loginEmbed] });
        }
        return interaction.reply({ content: '🟢 تم تسجيل دخولك الموحد كمسؤول دسباتش بنجاح، فترتك بدأت الحين بالتوفيق!', ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'dispatch_duty_off') {
        if (!activeDispatchDuty.has(interaction.user.id)) {
            return interaction.reply({ content: '⚠️ أنت لست مسجلاً بـ ديوتي الدسباتش حالياً لتسجيل الخروج!', ephemeral: true });
        }

        const startTime = activeDispatchDuty.get(interaction.user.id);
        const endTime = Date.now();
        const diffMs = endTime - startTime;
        const diffMins = Math.floor(diffMs / 60000); 

        activeDispatchDuty.delete(interaction.user.id);

        const allData = getPointsData();
        const previousMins = allData.dispatch_duty_hours[interaction.user.id] || 0;
        const totalMins = previousMins + diffMins;
        allData.dispatch_duty_hours[interaction.user.id] = totalMins;
        savePointsData(allData);

        const hoursDisplay = Math.floor(diffMins / 60);
        const minutesDisplay = diffMins % 60;
        const totalHours = Math.floor(totalMins / 60);
        const totalMinutes = totalMins % 60;

        const logChannel = interaction.guild.channels.cache.get(LOG_DISPATCH_DUTY_CHANNEL);
        if (logChannel) {
            const logoutEmbed = new EmbedBuilder()
                .setTitle('📢 [الدسباتش] إنهاء فترة عمل وحفظ الساعات')
                .addFields(
                    { name: '👤 مسؤول العمليات:', value: `${interaction.user}`, inline: true },
                    { name: '⏰ مدة هذه الفترة:', value: `**${hoursDisplay}** ساعة و **${minutesDisplay}** دقيقة`, inline: false },
                    { name: '📊 إجمالي ساعات الدسباتش الكلية:', value: `**${totalHours}** ساعة و **${totalMinutes}** دقيقة`, inline: false }
                )
                .setColor('#e74c3c')
                .setTimestamp();
            await logChannel.send({ embeds: [logoutEmbed] });
        }
        return interaction.reply({ content: `🔴 تم تسجيل خروجك بنجاح من نظام العمليات.\nقضيت بالفترة الحالية **${hoursDisplay}** ساعة و **${minutesDisplay}** دقيقة.\n💡 لا تنسى تضغط على زر **[تقديم استبيان الدسباتش]** لتوثيق توزيع الـ Zones وتنزيل التقرير!`, ephemeral: true });
    }

    // ================= [ نظام التقديمات ] =================
    if (interaction.isButton() && interaction.customId === 'ems_apply_btn') {
        const modal = new ModalBuilder().setCustomId('ems_apply_modal').setTitle('استمارة التقديم على الصحة');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ems_name').setLabel("الاسم:").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ems_age').setLabel("العمر:").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ems_exp').setLabel("هل لديك خبرات سابقة؟").setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ems_hours').setLabel("كم ساعة تتواجد؟").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ems_citizen').setLabel("رقم سيتيزن أي دي (Citizen ID):").setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ems_apply_modal') {
        await interaction.deferReply({ ephemeral: true });
        const name = interaction.fields.getTextInputValue('ems_name');
        const age = interaction.fields.getTextInputValue('ems_age');
        const exp = interaction.fields.getTextInputValue('ems_exp');
        const hours = interaction.fields.getTextInputValue('ems_hours');
        const citizenId = interaction.fields.getTextInputValue('ems_citizen');

        const reviewEmbed = new EmbedBuilder()
            .setTitle('📋 طلب تقديم جديد (EMS) 📋')
            .setDescription(`قدم بواسطة: ${interaction.user}`)
            .addFields(
                { name: '👤 الاسم:', value: name, inline: true },
                { name: '🎂 العمر:', value: age, inline: true },
                { name: '🆔 Citizen ID:', value: citizenId, inline: true },
                { name: '🛠️ الخبرات السابقة:', value: exp },
                { name: '⏰ ساعات التواجد:', value: hours }
            ).setColor('#f1c40f');
        if (URL_TICKET_IMAGE && URL_TICKET_IMAGE.startsWith('http')) reviewEmbed.setImage(URL_TICKET_IMAGE);

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ems_accept_${interaction.user.id}`).setLabel('قبول وإعطاء الرتب 🟢').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`ems_reject_${interaction.user.id}`).setLabel('رفض الطلب 🔴').setStyle(ButtonStyle.Danger)
        );

        const adminLogChannel = interaction.guild.channels.cache.get(CHANNEL_APPLY_LOG);
        if (adminLogChannel) {
            await adminLogChannel.send({ embeds: [reviewEmbed], components: [actionRow] });
            await interaction.editReply({ content: '✅ تم إرسال استمارة تقديمك بنجاح إلى روم المراجعة المحددة!' });
        } else {
            await interaction.editReply({ content: '❌ خطأ: لم يتم العثور على روم استقبال التقديمات الحالية.' });
        }
    }

    if (interaction.isButton() && (interaction.customId.startsWith('ems_accept_') || interaction.customId.startsWith('ems_reject_'))) {
        await interaction.deferReply({ ephemeral: true });
        const userId = interaction.customId.split('_')[2];
        const isAccept = interaction.customId.includes('accept');
        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (isAccept && member) await member.roles.add([ROLE_ACCEPT_1, ROLE_ACCEPT_2]).catch(() => null);

        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(isAccept ? '#2ecc71' : '#e74c3c')
            .setTitle(isAccept ? '🟢 تم قبول الموظف وإعطاء الرتب' : '🔴 تم رفض الطلب');
        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

        const decisionEmbed = new EmbedBuilder()
            .setTitle(isAccept ? '🟢 قرار قبول استمارة' : '🔴 قرار رفض استمارة')
            .addFields(
                { name: '👮 المسؤول عن القرار:', value: `${interaction.user}`, inline: true },
                { name: '👤 صاحب التقديم:', value: member ? `${member}` : `مستخدم غادر السيرفر (${userId})`, inline: true }
            ).setColor(isAccept ? '#2ecc71' : '#e74c3c').setTimestamp();

        const decisionChannel = interaction.guild.channels.cache.get(LOG_APPLY_DECISION);
        if (decisionChannel) await decisionChannel.send({ embeds: [decisionEmbed] });

        if (member) await member.send(isAccept ? '🎉 تهانينا! تم قبولك في قطاع الصحة وصُرفت لك الرتب التأسيسية.' : '💔 للأسف، تم رفض طلبك للإنضمام إلى قطاع الصحة حالياً.').catch(() => null);
        await interaction.editReply({ content: `✅ تم معالجة الطلب بنجاح وتوثيق القرار في روم لوق القبول والرفض!` });
    }

    // ================= [ نظام الإدارة والنقاط ] =================
    if (interaction.isButton() && interaction.customId.startsWith('admin_')) {
        const actionType = interaction.customId.split('_')[1];
        if (actionType === 'promote' || actionType === 'demote') {
            const modal = new ModalBuilder().setCustomId(`modal_getid_${actionType}`).setTitle(actionType === 'promote' ? "📈 ترقية موظف" : "📉 كسر رتبة موظف");
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("ID الموظف المستهدف:").setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (interaction.customId === 'admin_points_check') {
            const modal = new ModalBuilder().setCustomId('modal_points_check').setTitle('🔍 استعلام سريع عن ملف موظف');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("ادخل ID الموظف للمعاينة:").setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        let title = ""; let label2 = "السبب الحقيقي:";
        if (actionType === 'warn') title = "⚠️ تحذير موظف صحة";
        else if (actionType === 'fire') title = "❌ قرار فصل وسحب رتب الصحة كاملة";
        else if (actionType === 'points') { title = interaction.customId.includes('add') ? "➕ إضافة نقاط إنتاجية" : "➖ سحب نقاط وعقوبة"; label2 = "عدد النقاط (أرقام فقط):"; }

        const modal = new ModalBuilder().setCustomId(`modal_direct_${interaction.customId}`).setTitle(title);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel("ID الموظف المستهدف:").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason_value').setLabel(label2).setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_points_check') {
        const targetId = interaction.fields.getTextInputValue('target_id');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: '❌ تعذر العثور على هذا الشخص بالسيرفر، تأكد من الـ ID الصحيح.', ephemeral: true });

        const allData = getPointsData();
        const userPoints = allData.points[targetId] || 0;
        const userWarns = allData.warnings[targetId] || 0;
        const totalMinutes = allData.duty_hours[targetId] || 0;
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const pointsEmbed = new EmbedBuilder()
            .setTitle('📊 تفاصيل سجل الموظف من لوحة التحكم 📊')
            .setDescription(`الموظف المستعلم عنه: ${targetMember}`)
            .addFields(
                { name: '✨ إجمالي النقاط المسجلة حالياً:', value: `**${userPoints}** نقطة`, inline: true },
                { name: '⚠️ عدد التحذيرات التراكمية:', value: `**${userWarns}** تحذير`, inline: true },
                { name: '⏱️ إجمالي الساعات المقضية:', value: `**${hours}** ساعة و **${minutes}** دقيقة`, inline: false }
            )
            .setColor('#3498db').setTimestamp();

        return interaction.reply({ embeds: [pointsEmbed], ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_getid_')) {
        const actionType = interaction.customId.split('_')[2];
        const targetId = interaction.fields.getTextInputValue('target_id');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: '❌ تعذر العثور على هذا الشخص بالسيرفر، تأكد من الـ ID الصحيح.', ephemeral: true });

        activeActions.set(interaction.user.id, { actionType, targetId });
        const selectMenu = new StringSelectMenuBuilder().setCustomId('admin_role_select').setPlaceholder('اختر الرتبة الطبية المطلوبة من هنا...').addOptions(EMS_ROLES);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({ content: `🎯 المستهدف الحين: ${targetMember}\nالرجاء اختيار الرتبة المتأثرة من القائمة أدناه ليتم تعديلها فوراً وبشكل تلقائي:`, components: [row], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'admin_role_select') {
        const session = activeActions.get(interaction.user.id);
        if (!session) return interaction.reply({ content: '❌ انتهت الجلسة الأمنية، أعد المحاولة.', ephemeral: true });

        const { actionType, targetId } = session;
        const selectedRoleId = interaction.values[0];
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        const role = interaction.guild.roles.cache.get(selectedRoleId);

        if (!targetMember || !role) return interaction.reply({ content: '❌ خطأ: لم أجد العضو أو الرتبة المطلوبة في السيرفر.', ephemeral: true });

        if (actionType === 'promote') await targetMember.roles.add(selectedRoleId).catch(() => null);
        else await targetMember.roles.remove(selectedRoleId).catch(() => null);

        const logEmbed = new EmbedBuilder()
            .setTitle(actionType === 'promote' ? '📈 عملية ترقية جديدة' : '📉 عملية كسر رتبة')
            .addFields(
                { name: '👮 الإداري المسؤول:', value: `${interaction.user}`, inline: true },
                { name: '🚑 الموظف المستهدف:', value: `${targetMember}`, inline: true },
                { name: '📝 الرتبة المتأثرة:', value: `${role.name}` }
            ).setColor(actionType === 'promote' ? '#2ecc71' : '#e67e22').setTimestamp();

        const currentLogId = actionType === 'promote' ? LOG_PROMOTION : LOG_DEMOTE;
        const logChannel = interaction.guild.channels.cache.get(currentLogId);
        if (logChannel) await logChannel.send({ embeds: [logEmbed] });

        await targetMember.send(`✉️ إشعار إداري رسمي: تم ${actionType === 'promote' ? 'ترقيتك إلى' : 'تنزيل رتبتك من'} رتبة: **${role.name}** بقطاع الصحة.`).catch(() => null);
        await interaction.update({ content: `✅ تم تنفيذ الإجراء بنجاح وتوثيقه في روم اللوق المخصص له!`, components: [], ephemeral: true });
        activeActions.delete(interaction.user.id);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_direct_')) {
        const actionFull = interaction.customId.replace('modal_direct_admin_', '');
        const targetId = interaction.fields.getTextInputValue('target_id');
        const reasonOrValue = interaction.fields.getTextInputValue('reason_value');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود بالسيرفر.', ephemeral: true });

        let logChannelId = ''; let color = '#ffffff'; let actionTitle = ''; let pointsMessageDetail = '';
        const allData = getPointsData();

        if (actionFull === 'warn') { 
            logChannelId = LOG_WARN; color = '#f1c40f'; 
            const currentWarns = allData.warnings[targetId] || 0;
            const newWarns = currentWarns + 1;
            allData.warnings[targetId] = newWarns;
            savePointsData(allData);

            if (newWarns === 1) { if (ROLE_WARN_1 && ROLE_WARN_1.length > 5) await targetMember.roles.add(ROLE_WARN_1).catch(() => null); } 
            else if (newWarns === 2) {
                if (ROLE_WARN_1 && ROLE_WARN_1.length > 5) await targetMember.roles.remove(ROLE_WARN_1).catch(() => null);
                if (ROLE_WARN_2 && ROLE_WARN_2.length > 5) await targetMember.roles.add(ROLE_WARN_2).catch(() => null);
            } 
            else if (newWarns === 3) {
                if (ROLE_WARN_2 && ROLE_WARN_2.length > 5) await targetMember.roles.remove(ROLE_WARN_2).catch(() => null);
                if (ROLE_WARN_3 && ROLE_WARN_3.length > 5) await targetMember.roles.add(ROLE_WARN_3).catch(() => null);
            }

            let warnLevelName = newWarns > 3 ? `متعدي الحد الأقصى (التحذير رقم ${newWarns})` : `وورن ${newWarns}`;
            actionTitle = `⚠️ توجيه إنذار / تحذير طاقم فرعي [${warnLevelName}]`; 
            pointsMessageDetail = `\n📊 السجل التراكمي للتحذيرات: العضو لديه الآن **${newWarns}** تحذيرات وتم تحديث رتبته بالسيرفر.`;
        }
        else if (actionFull === 'fire') { 
            logChannelId = LOG_FIRE; color = '#c0392b'; actionTitle = '❌ قرار فصل رسمي ومسح صلاحيات الصحة'; 
            const allEmsRoleIds = [ROLE_ACCEPT_1, ROLE_ACCEPT_2, ROLE_WARN_1, ROLE_WARN_2, ROLE_WARN_3, ...EMS_ROLES.map(r => r.value)].filter(id => id && id.length > 5);
            await targetMember.roles.remove(allEmsRoleIds).catch(() => null);
            allData.warnings[targetId] = 0;
            savePointsData(allData);
        }
        else if (actionFull.startsWith('points')) { 
            logChannelId = LOG_POINTS; color = '#3498db'; 
            const pointsAmount = parseInt(reasonOrValue);
            if (isNaN(pointsAmount) || pointsAmount <= 0) return interaction.reply({ content: '❌ خطأ: الرجاء إدخل أرقام صحيحة وموجبة فقط في حقل النقاط.', ephemeral: true });

            const currentPoints = allData.points[targetId] || 0;
            let newPoints = currentPoints;

            if (actionFull.includes('add')) { newPoints += pointsAmount; actionTitle = `➕ إضافة نقاط إنتاجية (+${pointsAmount})`; } 
            else { newPoints = Math.max(0, currentPoints - pointsAmount); actionTitle = `➖ سحب نقاط وعقوبة (-${pointsAmount})`; }

            allData.points[targetId] = newPoints; savePointsData(allData); 
            pointsMessageDetail = `\n📊 الرصيد الإجمالي للموظف الآن: **${newPoints}** نقطة مسجلة.`;
        }

        const logEmbed = new EmbedBuilder()
            .setTitle(actionTitle)
            .addFields(
                { name: '👮 الإداري المسؤول:', value: `${interaction.user}`, inline: true },
                { name: '🚑 الموظف المستهدف:', value: `${targetMember}`, inline: true },
                { name: '📝 التفاصيل / البيان:', value: actionFull.startsWith('points') ? `تعديل الرصيد بقيمة ${reasonOrValue} نقاط.` : reasonOrValue }
            ).setDescription(pointsMessageDetail || null).setColor(color).setTimestamp();

        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) await logChannel.send({ embeds: [logEmbed] });

        await targetMember.send(`✉️ إشعار إداري عاجل من الإدارة الطبية:\nالإجراء المتخذ: **${actionTitle}**\n${pointsMessageDetail ? pointsMessageDetail : `البيان والتفاصيل: ${reasonOrValue}`}`).catch(() => null);
        await interaction.reply({ content: `✅ تم تنفيذ الإجراء الإداري وتحديث قاعدة البيانات وتوثيقه باللوغ!`, ephemeral: true });
    }

    // ================= [ 🚨 نظام استبيان الدسباتش المطور ] =================
    if (interaction.isButton() && interaction.customId === 'open_dispatch_modal') {
        if (!activeDispatchDuty.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ يجب عليك تسجيل دخولك فترة الدسباتش أولاً قبل تقديم الاستبيان!', ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId('dispatch_report_modal').setTitle('استبيان فترة الدسباتش');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('names_input').setLabel("الأسـم").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dispatch_name').setLabel("أسـم الـديسباتـش").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sub_dispatch_name').setLabel("أسـم نـائب الـديسباتـش").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('manager_input').setLabel("أسـم مـسؤول الـفـترة | التوقيت (من - الى)").setPlaceholder("مسؤول الفترة: فلان | من الساعة X الى Y").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('zones_input').setLabel("توزيع الـ Zones (1, 2, 3, 4)").setPlaceholder("Zone 1: فلان\nZone 2: فلان\nZone 3: فلان\nZone 4: فلان").setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'dispatch_report_modal') {
        const name = interaction.fields.getTextInputValue('names_input');
        const dispatchName = interaction.fields.getTextInputValue('dispatch_name');
        const subDispatchName = interaction.fields.getTextInputValue('sub_dispatch_name');
        const managerAndTime = interaction.fields.getTextInputValue('manager_input');
        const zonesInfo = interaction.fields.getTextInputValue('zones_input');

        const activeChannel = interaction.guild.channels.cache.get(ACTIVE_DISPATCH_CHANNEL);
        if (!activeChannel) return interaction.reply({ content: '❌ تعذر العثور على الروم المخصصة لإرسال الاستبيانات الحالية.', ephemeral: true });

        const formattedMessage = `**:SAMS: | SAN ANDREAS MEDICAL SERVICES .**
-# :megaphone: Medical Dispatch .

  الأسـم  : ${name}

  أسـم الـديسباتـش  : ${dispatchName}

  أسـم نـائب الـديسباتـش  : ${subDispatchName}

 أسـم مـسؤول الـفـترة والـتـوقيـت  : ${managerAndTime}

-# **ـــــــــــــــــــــــــــ**
${zonesInfo}

-# إرفاق صورة إلزامي، ولن يتم اعتماد الاستبيان بدونها داخل الثريد أدناه
-# \`[ + ]\` <@&1499850630544621639> .`;

        const sentMessage = await activeChannel.send({ content: formattedMessage });

        try {
            await sentMessage.startThread({
                name: `📸 صـورة الـفـتـرة - ${dispatchName}`,
                autoArchiveDuration: 60,
                reason: 'ثريد مخصص لإرفاق صورة إثبات العمل للفترة الطبية'
            });
        } catch (error) {
            console.error('حدث خطأ أثناء فتح الثريد:', error);
        }

        await interaction.reply({ content: '✅ تم إرسال استبيان الفترة، وتم فتح ثريد تلقائياً تحت رسالتك لرفع الصورة!', ephemeral: true });
    }
});

client.on('error', console.error);
client.login(process.env.BOT_TOKEN);
