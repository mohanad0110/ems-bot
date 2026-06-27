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

// دالة جلب البيانات المحدثة لدعم النقاط، التحذيرات، وساعات العمل، والمناطق الديناميكية
function getPointsData() {
    if (!fs.existsSync(POINTS_FILE)) fs.writeFileSync(POINTS_FILE, JSON.stringify({ points: {}, warnings: {}, duty_hours: {}, dispatch_duty_hours: {}, custom_zones: [] }));
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
    if (!data.custom_zones) data.custom_zones = ["Zone 1", "Zone 2", "Zone 3", "Zone 4"]; // المناطق الافتراضية الأساسية
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

// ❓ إعدادات روم الأسئلة وروم إدارة الإجابات الجديد ❓
const CHANNEL_QUESTIONS = '1515788550329597984'; 
const CHANNEL_ADMIN_ANSWERS = '1515788520378204263'; 

// 🖼️ روابط الصور المنفصلة الثلاثة وصورة غلاف اللوحة
const URL_APPLY_PANEL_IMAGE = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 
const URL_TICKET_IMAGE      = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 
const URL_ADMIN_PANEL_IMAGE = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 
const URL_DUTY_PANEL_IMAGE  = 'https://media.discordapp.net/attachments/1515788498638995607/1517239853241209073/Medic13x.png?ex=6a3a2c79&is=6a38daf9&hm=6bdfe04cd3b1bacc103b5224aabce28cff736cf47901d6435fed1f4ac7830521&=&format=webp&quality=lossless&width=1872&height=559'; 

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
    console.log(`✅ البوت جاهز، ومفعل نظام الترحيب والديوتي والدسباتش والأسئلة السرية: ${client.user.tag}`);
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
    if (message.author.bot) return;

    // ❓ [نظام مراقبة روم الأسئلة الذكي والمسح الفوري] ❓
    if (message.channelId === CHANNEL_QUESTIONS) {
        const questionText = message.content.trim();
        if (!questionText) return;

        // حذف رسالة العضو فوراً لإبقاء الشات نظيفاً
        await message.delete().catch(() => null);

        const adminChannel = message.guild.channels.cache.get(CHANNEL_ADMIN_ANSWERS);
        if (!adminChannel) return message.author.send("❌ خطأ: لم يتم العثور على روم إدارة الأسئلة، يرجى إبلاغ الإدارة العليا.").catch(() => null);

        // إرسال السؤال إلى روم الإدارة المخصص
        const questionEmbed = new EmbedBuilder()
            .setTitle('❓ سؤال جديد يحتاج إلى إجابة طاقم الإدارة')
            .addFields(
                { name: '👤 المرسل:', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                { name: '📅 التوقيت:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '💬 نص السؤال:', value: `\`\`\`text\n${questionText}\n\`\`\`` }
            )
            .setColor('#f1c40f').setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`answer_question_btn_${message.author.id}`) // نمرر الـ ID الخاص بالسائل في معرف الزر
                .setLabel('📝 الإجابة على السؤال')
                .setStyle(ButtonStyle.Primary)
        );

        await adminChannel.send({ embeds: [questionEmbed], components: [row] });
        
        // طمأنة العضو بالخاص أنه تم استلام سؤاله بنجاح
        return message.author.send(`✅ تم استلام سؤالك بنجاح وجاري مراجعته من قِبل الإدارة الطبية، سيصلك الجواب هنا في الخاص فوراً.`).catch(() => null);
    }

    if (!message.content.startsWith(PREFIX)) return;

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
            .setTitle('🚑 التقديم على وزارة الصحة (EMS) 🚑')
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
            .setDescription('مرحباً بك في لوحة تحكم نظام الدسباتش الموحدة.\nيرجى استخدام الأزرار أدناه لتسجيل فترتك الحالية، أو لتوزيع الـ Zones عند النهاية.\n\n🟢 **دخول فترة دسباتش:** لبدء احتويت وقت الشفت الخاص بك.\n🔴 **خروج فترة دسباتش:** لإنهاء شفتك وحفظ ساعات العمل.\n📝 **توزيع المناطق الذكي:** لرفع تقرير وتوزيع المناطق تلقائياً عبر قوائم منسدلة.')
            .setColor('#e74c3c')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dispatch_duty_on').setLabel('دخول فترة دسباتش 🟢').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('dispatch_duty_off').setLabel('خروج فترة دسباتش 🔴').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('open_dispatch_modal').setLabel('توزيع الـ Zones الذكي 🗺️').setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete();
    }

    // أمر إضافة منطقة جديدة للبنل بدون تعديل الكود
    if (command === 'add-zone') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للادارة العليا فقط.');
        const zoneName = args.join(' ');
        if (!zoneName) return message.reply('❌ يرجى كتابة اسم المنطقة، مثال: `!add-zone Zone 5`');

        const allData = getPointsData();
        if (allData.custom_zones.includes(zoneName)) return message.reply('⚠️ هذه المنطقة موجودة بالفعل في اللوحة!');
        if (allData.custom_zones.length >= 5) return message.reply('⚠️ الحد الأقصى للمناطق في الرسالة الواحدة هو 5 مناطق.');

        allData.custom_zones.push(zoneName);
        savePointsData(allData);
        return message.reply(`✅ تم إضافة المنطقة الجديدة **[ ${zoneName} ]** بنجاح للوحة الدسباتش!`);
    }

    // أمر حذف منطقة من اللوحة
    if (command === 'remove-zone') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للادارة العليا فقط.');
        const zoneName = args.join(' ');
        if (!zoneName) return message.reply('❌ يرجى كتابة اسم المنطقة لحذفها، مثال: `!remove-zone Zone 5`');

        const allData = getPointsData();
        if (!allData.custom_zones.includes(zoneName)) return message.reply('❌ هذه المنطقة غير موجودة بالأساس في اللوحة.');

        allData.custom_zones = allData.custom_zones.filter(z => z !== zoneName);
        savePointsData(allData);
        return message.reply(`🗑️ تم حذف المنطقة **[ ${zoneName} ]** من لوحة الدسباتش بنجاح.`);
    }
});

client.on('interactionCreate', async (interaction) => {
    
    // ❓ [تفاعل فتح مودال الإجابة على الأسئلة] ❓
    if (interaction.isButton() && interaction.customId.startsWith('answer_question_btn_')) {
        const applicantId = interaction.customId.replace('answer_question_btn_', '');
        
        const modal = new ModalBuilder()
            .setCustomId(`modal_answer_submit_${applicantId}`)
            .setTitle('📝 كتابة الإجابة الرسمية على السؤال');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('answer_text_input')
                    .setLabel('اكتب تفاصيل الإجابة بوضوح هنا:')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            )
        );
        return await interaction.showModal(modal);
    }

    // ❓ [استلام الإجابة من المودال وإرسالها بالخاص] ❓
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_answer_submit_')) {
        const targetUserId = interaction.customId.replace('modal_answer_submit_', '');
        const adminAnswerText = interaction.fields.getTextInputValue('answer_text_input');

        const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
        
        // جلب السؤال الأصلي المكتوب في الإمبيد لتذكير العضو بسؤاله
        const oldEmbed = interaction.message.embeds[0];
        const originalQuestionField = oldEmbed.fields.find(f => f.name === '💬 نص السؤال:').value;

        if (!targetUser) {
            return interaction.reply({ content: '❌ تعذر العثور على صاحب السؤال بالسيرفر، قد يكون غادر أو حسابه مغلق.', ephemeral: true });
        }

        // صياغة إمبيد الخاص للعضو
        const userDmEmbed = new EmbedBuilder()
            .setTitle('✉️ إشعار رسمي: الإجابة على استفسارك')
            .setDescription(`مرحباً بك، قامت الإدارة الطبية بمراجعة سؤالك وجاء الرد كالتالي:`)
            .addFields(
                { name: '📥 سؤالك الأصلي:', value: originalQuestionField },
                { name: '🟢 الإجابة والبيان:', value: `\`\`\`text\n${adminAnswerText}\n\`\`\`` },
                { name: '👮 المجيب من الإدارة:', value: `${interaction.user}` }
            )
            .setColor('#2ecc71').setTimestamp();

        // إرسال الإجابة لخاص الموظف
        const sendSuccess = await targetUser.send({ embeds: [userDmEmbed] }).then(() => true).catch(() => false);

        if (!sendSuccess) {
            return interaction.reply({ content: `❌ تعذر إرسال الإجابة، الموظف مغلق الخاص (DMs) لديه.`, ephemeral: true });
        }

        // تحديث إمبيد روم الإدارة ليوضح أنه تم الإجابة بنجاح وإلغاء الأزرار
        const updatedAdminEmbed = EmbedBuilder.from(oldEmbed)
            .setTitle('✅ تم الإجابة على هذا السؤال وإرسالها للخاص')
            .addFields({ name: '📝 الإجابة الموجهة:', value: adminAnswerText })
            .setColor('#2ecc71');

        await interaction.message.edit({ embeds: [updatedAdminEmbed], components: [] });
        return interaction.reply({ content: `✅ تم إرسال الإجابة لخاص الموظف بنجاح وتحديث اللوق!`, ephemeral: true });
    }

    // ================= [ نظام الدخول والخروج - الموظفين ] =================
    if (interaction.isButton() && interaction.customId === 'duty_on_btn') {
        if (activeDuty.has(interaction.user.id)) return interaction.reply({ content: '⚠️ أنت مسجل دخولك بالفعل بالخدمة مسبقاً!', ephemeral: true });

        activeDuty.set(interaction.user.id, Date.now());
        
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

    // ================= [ نظام الدخول والخروج - الدسباتش ] =================
    if (interaction.isButton() && interaction.customId === 'dispatch_duty_on') {
        if (activeDispatchDuty.has(interaction.user.id)) return interaction.reply({ content: '⚠️ أنت مسجل دخول فترة الدسباتش مسبقاً!', ephemeral: true });
        activeDispatchDuty.set(interaction.user.id, Date.now());

        const logChannel = interaction.guild.channels.cache.get(LOG_DISPATCH_DUTY_CHANNEL);
        if (logChannel) {
            const loginEmbed = new EmbedBuilder()
                .setTitle('🟢 بدء فترة دسباتش جديدة')
                .addFields(
                    { name: '👮 الدسباتش المسؤول:', value: `${interaction.user}`, inline: true },
                    { name: '⏰ وقت البدء:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                ).setColor('#2ecc71').setTimestamp();
            await logChannel.send({ embeds: [loginEmbed] });
        }
        return interaction.reply({ content: '🟢 تم بدء فترة احتساب وقت الدسباتش بنجاح! بالتوفيق.', ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'dispatch_duty_off') {
        if (!activeDispatchDuty.has(interaction.user.id)) return interaction.reply({ content: '⚠️ أنت لست مسجلاً في الخدمة حالياً ليتم تسجيل خروجك!', ephemeral: true });

        const startTime = activeDispatchDuty.get(interaction.user.id);
        const diffMs = Date.now() - startTime;
        const diffMins = Math.floor(diffMs / 60000);

        activeDispatchDuty.delete(interaction.user.id);

        const allData = getPointsData();
        allData.dispatch_duty_hours[interaction.user.id] = (allData.dispatch_duty_hours[interaction.user.id] || 0) + diffMins;
        savePointsData(allData);

        const logChannel = interaction.guild.channels.cache.get(LOG_DISPATCH_DUTY_CHANNEL);
        if (logChannel) {
            const logoutEmbed = new EmbedBuilder()
                .setTitle('🔴 انتهاء فترة دسباتش')
                .addFields(
                    { name: '👮 الدسباتش المسؤول:', value: `${interaction.user}`, inline: true },
                    { name: '⏳ المدة المستغرقة بالفترة:', value: `**${Math.floor(diffMins / 60)}** ساعة و **${diffMins % 60}** دقيقة` }
                ).setColor('#e74c3c').setTimestamp();
            await logChannel.send({ embeds: [logoutEmbed] });
        }
        return interaction.reply({ content: `🔴 تم إنهاء فترة الدسباتش وحفظ الوقت بنجاح.`, ephemeral: true });
    }

    // ================= [ نظام استبيان الدسباتش المطور بالقوائم المنسدلة الديناميكية ] =================
    if (interaction.isButton() && interaction.customId === 'open_dispatch_modal') {
        if (!activeDispatchDuty.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ يجب عليك تسجيل دخولك فترة الدسباتش أولاً قبل توزيع المناطق!', ephemeral: true });
        }

        const currentStaffIds = Array.from(activeDuty.keys());
        if (currentStaffIds.length === 0) {
            return interaction.reply({ content: '⚠️ لا يوجد أي موظف مسجل دخول (On Duty) حالياً في السيرفر لتوزيعه على المناطق!', ephemeral: true });
        }

        const staffOptions = [];
        for (const staffId of currentStaffIds) {
            const member = await interaction.guild.members.fetch(staffId).catch(() => null);
            if (member) {
                staffOptions.push({ label: member.displayName || member.user.username, value: staffId, description: `الـ ID: ${staffId}` });
            }
        }

        staffOptions.push({ label: '❌ لا يوجد موظف متاح لهذه المنطقة', value: 'empty_zone', description: 'إبقاء المنطقة شاغرة مؤقتاً' });

        const allData = getPointsData();
        const currentZones = allData.custom_zones;

        if (currentZones.length === 0) {
            return interaction.reply({ content: '⚠️ اللوحة فارغة، يرجى من الإدارة إضافة مناطق أولاً باستخدام أمر `!add-zone`', ephemeral: true });
        }

        const setupEmbed = new EmbedBuilder()
            .setTitle('🗺️ لوحة توزيع المناطق الطبية الديناميكية')
            .setDescription(`قم بتحديد الموظف لكل منطقة من القوائم أدناه.\n\n*عدد المناطق الحالية المطلوب توزيعها:* **${currentZones.length}**`)
            .setColor('#3498db').setTimestamp();

        const rows = [];
        const initialSessionZones = {};

        currentZones.forEach((zoneName, index) => {
            initialSessionZones[`zone_${index}`] = null; 
            rows.push(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`dispatch_dyn_zone_${index}`) 
                        .setPlaceholder(`اختر موظف لـ ( ${zoneName} )...`)
                        .addOptions(staffOptions)
                )
            );
        });

        if (!client.dispatchSessions) client.dispatchSessions = new Map();
        client.dispatchSessions.set(interaction.user.id, { selections: initialSessionZones, zonesNames: currentZones });

        await interaction.reply({ embeds: [setupEmbed], components: rows, ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dispatch_dyn_zone_')) {
        if (!client.dispatchSessions) client.dispatchSessions = new Map();
        const session = client.dispatchSessions.get(interaction.user.id);

        if (!session) return interaction.reply({ content: '❌ انتهت الجلسة الأمنية، يرجى إعادة فتح اللوحة.', ephemeral: true });

        const selectedValue = interaction.values[0];
        const zoneIndex = interaction.customId.replace('dispatch_dyn_zone_', ''); 
        
        session.selections[`zone_${zoneIndex}`] = selectedValue === 'empty_zone' ? '❌ غـيـر مـتـوفـر' : `<@${selectedValue}>`;
        client.dispatchSessions.set(interaction.user.id, session);

        const totalRequired = session.zonesNames.length;
        const totalFilled = Object.values(session.selections).filter(val => val !== null).length;

        if (totalFilled === totalRequired) {
            const activeChannel = interaction.guild.channels.cache.get(ACTIVE_DISPATCH_CHANNEL);
            if (!activeChannel) return interaction.reply({ content: '❌ تعذر العثور على روم إرسال التقرير.', ephemeral: true });

            let zonesReportText = "";
            session.zonesNames.forEach((name, index) => {
                zonesReportText += `🗺️ **${name} :** ${session.selections[`zone_${index}`]}\n`;
            });

            const formattedMessage = `**:SAMS: | SAN ANDREAS MEDICAL SERVICES .**
-# :megaphone: Dynamic Medical Dispatch Report .

  أسـم الـديسباتـش  : ${interaction.member}
  توقيت التوزيع  : <t:${Math.floor(Date.now() / 1000)}:t>

-# **ــــــــــــــــ توزيع المناطق الطبية ــــــــــــــــ**
${zonesReportText}
-# إرفاق صورة إلزامي، ولن يتم اعتماد الاستبيان بدونها داخل الثريد أدناه
-# \`[ + ]\` <@&1499850630544621639> .`;

            const sentMessage = await activeChannel.send({ content: formattedMessage });

            try {
                await sentMessage.startThread({ name: `📸 صورة الفترة - ${interaction.user.username}`, autoArchiveDuration: 60 });
            } catch (error) { console.error(error); }

            client.dispatchSessions.delete(interaction.user.id);
            return await interaction.update({ content: '✅ تم توزيع جميع المناطق الحالية وإرسال تقريرك بنجاح وفُتح ثريد الصور!', embeds: [], components: [], ephemeral: true });
        } else {
            return await interaction.reply({ content: `📥 تم تسجيل اختيارك للمنطقة بنجاح، يرجى إكمال باقي القوائم المعروضة.`, ephemeral: true }).catch(() => null);
        }
    }

    // ================= [ نظام التقديم الذكي المطور (Modal + أزرار) ] =================
    if (interaction.isButton() && interaction.customId === 'ems_apply_btn') {
        const modal = new ModalBuilder().setCustomId('ems_apply_modal').setTitle('استمارة الانضمام لقطاع الصحة');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apply_name').setLabel("الاسم الثلاثي:").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apply_age').setLabel("العمر والفل الحقيقي:").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apply_exp').setLabel("هل لديك خبرة سابقة في قطاع الصحة؟").setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apply_hours').setLabel("عدد الساعات المتوقعة للتواجد يومياً:").setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ems_apply_modal') {
        const name = interaction.fields.getTextInputValue('apply_name');
        const age = interaction.fields.getTextInputValue('apply_age');
        const exp = interaction.fields.getTextInputValue('apply_exp');
        const hours = interaction.fields.getTextInputValue('apply_hours');

        const logChannel = interaction.guild.channels.cache.get(CHANNEL_APPLY_LOG);
        if (!logChannel) return interaction.reply({ content: '❌ خطأ: روم تقديم الطلبات غير موجودة.', ephemeral: true });

        const applyEmbed = new EmbedBuilder().setTitle('📝 طلب انضمام جديد لقطاع الصحة').setDescription(`**صاحب الطلب:** ${interaction.user}\n**الـ ID:** \`${interaction.user.id}\``).addFields({ name: '👤 الاسم:', value: name, inline: true }, { name: '🎂 العمر:', value: age, inline: true }, { name: '⏱️ الساعات اليومية:', value: hours, inline: true }, { name: '📖 الخبرات السابقة:', value: exp }).setColor('#e74c3c').setTimestamp();
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`app_accept_${interaction.user.id}`).setLabel('قبول الطلب ✅').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`app_reject_${interaction.user.id}`).setLabel('رفض الطلب ❌').setStyle(ButtonStyle.Danger));

        await logChannel.send({ embeds: [applyEmbed], components: [row] });
        return interaction.reply({ content: '✅ تم إرسال استمارتك بنجاح للإدارة الطبية، انتظر الرد في الخاص.', ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId.startsWith('app_')) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ ليس لديك صلاحية اتخاذ القرار في التقديمات.', ephemeral: true });

        const [, action, applicantId] = interaction.customId.split('_');
        const applicant = await interaction.guild.members.fetch(applicantId).catch(() => null);
        
        const oldEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(oldEmbed).addFields({ name: '📢 قرار الإدارة:', value: action === 'accept' ? `🟢 تم القبول بواسطة ${interaction.user}` : `🔴 تم الرفض بواسطة ${interaction.user}` });

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
        const decisionChannel = interaction.guild.channels.cache.get(LOG_APPLY_DECISION);

        if (action === 'accept') {
            if (applicant) {
                if (ROLE_ACCEPT_2 && ROLE_ACCEPT_2.length > 5) await applicant.roles.add(ROLE_ACCEPT_2).catch(() => null);
                await applicant.send(`🎉 تهانينا! تم قبول طلب انضمامك لقطاع الصحة (EMS). يرجى مراجعة الإدارة لإكمال المقابلة الشخصية.`).catch(() => null);
            }
            if (decisionChannel) await decisionChannel.send({ content: `🟢 تم قبول العضو <@${applicantId}> في قطاع الصحة بواسطة الإداري ${interaction.user}` });
        } else {
            if (applicant) await applicant.send(`للأسف، تم رفض طلب انضمامك لقطاع الصحة حالياً. نتمنى لك التوفيق في المرات القادمة.`).catch(() => null);
            if (decisionChannel) await decisionChannel.send({ content: `🔴 تم رفض العضو <@${applicantId}> بواسطة الإداري ${interaction.user}` });
        }
        return interaction.reply({ content: `✅ تم تسجيل القرار وإشعار المتقدم بنجاح.`, ephemeral: true });
    }

    // ================= [ قائمة شؤون الموظفين السريعة بالنيابة ] =================
    if (interaction.isButton() && interaction.customId === 'admin_panel_shortcut') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ هذا الزر مخصص لإدارة شؤون الموظفين فقط.', ephemeral: true });
        
        const embed = new EmbedBuilder().setTitle('⚙️ لوحة تحكم إدارة قطاع الصحة السريعة ⚙️').setDescription('اختر الإجراء الإداري المطلوب لتنفيذه وتوثيقه فوراً:').setColor('#2c3e50');
        const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('admin_promote').setLabel('ترقية موظف 📈').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('admin_demote').setLabel('كسر رتبة 📉').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('admin_warn').setLabel('تحذير موظف ⚠️').setStyle(ButtonStyle.Danger));
        const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('admin_points_add').setLabel('إضافة نقاط ➕').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('admin_points_remove').setLabel('سحب نقاط ➖').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('admin_points_check').setLabel('ساعات ونقاط الموظف 🔍').setStyle(ButtonStyle.Primary));
        const row3 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('admin_force_on').setLabel('تسجيل دخول لموظف 🟢').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('admin_force_off').setLabel('تسجيل خروج لموظف 🔴').setStyle(ButtonStyle.Danger));
        await interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
    }

    if (interaction.isButton() && (interaction.customId === 'admin_force_on' || interaction.customId === 'admin_force_off')) {
        const isLogin = interaction.customId === 'admin_force_on';
        const modal = new ModalBuilder().setCustomId(isLogin ? 'modal_force_login' : 'modal_force_logout').setTitle(isLogin ? '🟢 تسجيل دخول بالنيابة' : '🔴 تسجيل خروج بالنيابة');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_staff_id').setLabel('أدخل ID الموظف المستهدف:').setStyle(TextInputStyle.Short).setRequired(true)));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_force_login') {
        const targetId = interaction.fields.getTextInputValue('target_staff_id');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        
        if (!targetMember) return interaction.reply({ content: '❌ تعذر العثور على هذا الشخص بالسيرفر، تأكد من الـ ID.', ephemeral: true });
        if (activeDuty.has(targetId)) return interaction.reply({ content: '⚠️ هذا الموظف مسجل دخوله بالخدمة بالفعل!', ephemeral: true });

        activeDuty.set(targetId, Date.now());
        const dutyChannel = interaction.guild.channels.cache.get(interaction.channelId);
        if (dutyChannel) {
            const mainMessage = await dutyChannel.messages.fetch(interaction.message.reference?.messageId || interaction.message.id).catch(() => null);
            if (mainMessage) await mainMessage.edit({ embeds: [createDutyEmbed(interaction.guild)] }).catch(() => null);
        }

        const logChannel = interaction.guild.channels.cache.get(LOG_DUTY_CHANNEL);
        if (logChannel) {
            const loginEmbed = new EmbedBuilder().setTitle('🟢 تسجيل دخول إداري بالنيابة').addFields({ name: '🚑 الموظف:', value: `${targetMember}`, inline: true }, { name: '👮 المسؤول:', value: `${interaction.user}`, inline: true }, { name: '⏰ وقت الدخول:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }).setColor('#2ecc71').setTimestamp();
            await logChannel.send({ embeds: [loginEmbed] });
        }
        return interaction.reply({ content: `✅ تم تسجيل دخول الموظف ${targetMember} بنجاح!`, ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_force_logout') {
        const targetId = interaction.fields.getTextInputValue('target_staff_id');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        
        if (!targetMember) return interaction.reply({ content: '❌ تعذر العثور على هذا الشخص بالسيرفر.', ephemeral: true });
        if (!activeDuty.has(targetId)) return interaction.reply({ content: '⚠️ هذا الموظف ليس مسجلاً بالخدمة حالياً ليتم إخراجه!', ephemeral: true });

        const startTime = activeDuty.get(targetId);
        const diffMins = Math.floor((Date.now() - startTime) / 60000); 

        activeDuty.delete(targetId);
        const dutyChannel = interaction.guild.channels.cache.get(interaction.channelId);
        if (dutyChannel) {
            const mainMessage = await dutyChannel.messages.fetch(interaction.message.reference?.messageId || interaction.message.id).catch(() => null);
            if (mainMessage) await mainMessage.edit({ embeds: [createDutyEmbed(interaction.guild)] }).catch(() => null);
        }

        const allData = getPointsData();
        allData.duty_hours[targetId] = (allData.duty_hours[targetId] || 0) + diffMins;
        savePointsData(allData);

        const logChannel = interaction.guild.channels.cache.get(LOG_DUTY_CHANNEL);
        if (logChannel) {
            const logoutEmbed = new EmbedBuilder().setTitle('🔴 تسجيل خروج إداري بالنيابة').addFields({ name: '🚑 الموظف البديل:', value: `${targetMember}`, inline: true }, { name: '👮 الإداري المسؤول:', value: `${interaction.user}`, inline: true }, { name: '⏰ مدة هذه المناوبة:', value: `**${Math.floor(diffMins / 60)}** ساعة و **${diffMins % 60}** دقيقة`, inline: false }).setColor('#e74c3c').setTimestamp();
            await logChannel.send({ embeds: [logoutEmbed] });
        }
        return interaction.reply({ content: `✅ تم تسجيل خروج الموظف ${targetMember} بنجاح!`, ephemeral: true });
    }

    // ================= [ باقي أنظمة الإدارة والنقاط السابقة ] =================
    if (interaction.isButton() && interaction.customId.startsWith('admin_') && interaction.customId !== 'admin_force_on' && interaction.customId !== 'admin_force_off') {
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
        
        const pointsEmbed = new EmbedBuilder().setTitle('📊 تفاصيل سجل الموظف 📊').setDescription(`الموظف المستعلم عنه: ${targetMember}`).addFields({ name: '✨ إجمالي النقاط المسجلة حالياً:', value: `**${userPoints}** نقطة`, inline: true }, { name: '⚠️ عدد التحذيرات التراكمية:', value: `**${userWarns}** تحذير`, inline: true }, { name: '⏱️ إجمالي الساعات المقضية:', value: `**${Math.floor(totalMinutes / 60)}** ساعة و **${totalMinutes % 60}** دقيقة`, inline: false }).setColor('#3498db').setTimestamp();
        return interaction.reply({ embeds: [pointsEmbed], ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_getid_')) {
        const actionType = interaction.customId.split('_')[2];
        const targetId = interaction.fields.getTextInputValue('target_id');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: '❌ تعذر العثور على هذا الشخص بالسيرفر.', ephemeral: true });

        activeActions.set(interaction.user.id, { actionType, targetId });
        const selectMenu = new StringSelectMenuBuilder().setCustomId('admin_role_select').setPlaceholder('اختر الرتبة الطبية المطلوبة من هنا...').addOptions(EMS_ROLES);
        await interaction.reply({ content: `🎯 المستهدف الحين: ${targetMember}\nالرجاء اختيار الرتبة المتأثرة من القائمة أدناه:`, components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
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

        const logEmbed = new EmbedBuilder().setTitle(actionType === 'promote' ? '📈 عملية ترقية جديدة' : '📉 عملية كسر رتبة').addFields({ name: '👮 الإداري المسؤول:', value: `${interaction.user}`, inline: true }, { name: '🚑 الموظف المستهدف:', value: `${targetMember}`, inline: true }, { name: '📝 الرتبة المتأثرة:', value: `${role.name}` }).setColor(actionType === 'promote' ? '#2ecc71' : '#e67e22').setTimestamp();
        const currentLogId = actionType === 'promote' ? LOG_PROMOTION : LOG_DEMOTE;
        const logChannel = interaction.guild.channels.cache.get(currentLogId);
        if (logChannel) await logChannel.send({ embeds: [logEmbed] });

        await targetMember.send(`✉️ إشعار إداري رسمي: تم ${actionType === 'promote' ? 'ترقيتك إلى' : 'تنزيل رتبتك من'} رتبة: **${role.name}** بقطاع الصحة.`).catch(() => null);
        await interaction.update({ content: `✅ تم تنفيذ الإجراء بنجاح وتوثيقه في روم اللوق!`, components: [], ephemeral: true });
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
            actionTitle = `⚠️ توججه إنذار / تحذير طاقم فرعي [وورن ${newWarns}]`; 
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

        const logEmbed = new EmbedBuilder().setTitle(actionTitle).addFields({ name: '👮 الإداري المسؤول:', value: `${interaction.user}`, inline: true }, { name: '🚑 الموظف المستهدف:', value: `${targetMember}`, inline: true }, { name: '📝 التفاصيل / البيان:', value: actionFull.startsWith('points') ? `تعديل الرصيد بقيمة ${reasonOrValue} نقاط.` : reasonOrValue }).setDescription(pointsMessageDetail || null).setColor(color).setTimestamp();
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) await logChannel.send({ embeds: [logEmbed] });

        await targetMember.send(`✉️ إشعار إداري عاجل من الإدارة الطبية:\nالإجراء المتخذ: **${actionTitle}**\n${pointsMessageDetail ? pointsMessageDetail : `البيان والتفاصيل: ${reasonOrValue}`}`).catch(() => null);
        await interaction.reply({ content: `✅ تم تنفيذ الإجراء الإداري وتحديث قاعدة البيانات وتوثيقه باللوغ!`, ephemeral: true });
    }
});

client.on('error', console.error);
client.login(process.env.BOT_TOKEN);
