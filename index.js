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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates 
    ]
});

const PREFIX = '!'; 
const POINTS_FILE = './points.json';

function getPointsData() {
    if (!fs.existsSync(POINTS_FILE)) fs.writeFileSync(POINTS_FILE, JSON.stringify({ points: {}, warnings: {}, duty_hours: {}, dispatch_duty_hours: {}, custom_zones: [], leave_users: [] }));
    let data;
    try { data = JSON.parse(fs.readFileSync(POINTS_FILE, 'utf-8')); } catch (e) { data = {}; }
    if (!data.points) data.points = {};
    if (!data.warnings) data.warnings = {};
    if (!data.duty_hours) data.duty_hours = {}; 
    if (!data.dispatch_duty_hours) data.dispatch_duty_hours = {}; 
    if (!data.custom_zones) data.custom_zones = ["Zone 1", "Zone 2", "Zone 3", "Zone 4"];
    if (!data.leave_users) data.leave_users = []; // لحفظ المتواجدين في إجازة رسمية حماية من الرادار
    return data;
}

function savePointsData(data) {
    fs.writeFileSync(POINTS_FILE, JSON.stringify(data, null, 4));
}

const activeDuty = new Map();
const activeDispatchDuty = new Map();
const activeActions = new Map();
const securityOtps = new Map();

// ================= [ 🚑 إعدادات الرتب ورومات اللوق بالـ ID 🚑 ] =================
const ROLE_WARN_1 = '1515788388110962768'; 
const ROLE_WARN_2 = '1515788389671108649'; 
const ROLE_WARN_3 = '1515788391449366648'; 
const ROLE_LEAVE = '1520315094855061677'; // 📅 ضَع هنا ID رتبة "في إجازة / On Leave" لحماية الموظف وتلوينه

const CHANNEL_WELCOME_LOG = '1515788540116467972'; 
const CHANNEL_APPLY_LOG = '1518097965120491652'; 
const LOG_DUTY_CHANNEL = '1515788579199123506'; 

const DISPATCH_CONTROL_CHANNEL = '1519907806356967575'; 
const ACTIVE_DISPATCH_CHANNEL = '1515788576426819724';  
const LOG_DISPATCH_DUTY_CHANNEL = '1519908274915250288'; 

const CHANNEL_QUESTIONS = '1515788550329597984'; 
const CHANNEL_ADMIN_ANSWERS = '1515788520378204263'; 

const CHANNEL_ADMIN_REPORT_INPUT = '1515788514942517371'; 
const CHANNEL_PUBLIC_REPORT_OUTPUT = '1515788559322190067'; 

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

// 📈 شروط نظام الترقيات التلقائي الذكي لجميع الرتب
const PROMOTION_REQUIREMENTS = [
    { roleId: '1515788324873306255', name: '⚕️ EMT', requiredPoints: 30, requiredMinutes: 180 },          
    { roleId: '1515788323644244038', name: '🩺 Senior EMT', requiredPoints: 80, requiredMinutes: 480 },   
    { roleId: '1515788322495270962', name: '🩺 AEMT', requiredPoints: 150, requiredMinutes: 900 },         
    { roleId: '1515788321203290263', name: '🚑 Paramedic', requiredPoints: 240, requiredMinutes: 1440 },    
    { roleId: '1515788319961911327', name: '🚑 Advanced Paramedic', requiredPoints: 350, requiredMinutes: 2100 }, 
    { roleId: '1515788318556684308', name: '👨‍⚕️ Trainee Doctor', requiredPoints: 480, requiredMinutes: 2880 },   
    { roleId: '1515788317365633114', name: '🥼 Scientist', requiredPoints: 620, requiredMinutes: 3900 },       
    { roleId: '1515788315909947522', name: '👨‍⚕️ Doctor', requiredPoints: 800, requiredMinutes: 5100 },          
    { roleId: '1515788314592940253', name: '👨‍⚕️ Professor', requiredPoints: 1000, requiredMinutes: 6600 }       
];

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
        activeStaffList += `**${count}.** <@${userId}> | وقت التحضير: <t:${Math.floor(data.startTime / 1000)}:t> ${data.isAfk ? '⚠️ (خامل/كامي مايك)' : '🟢 (نشط بالصوت)'}\n`;
        count++;
    });
    if (activeStaffList === "") activeStaffList = "*لا يوجد موظفين في الخدمة حالياً.*";
    const embed = new EmbedBuilder().setTitle('سجل التحضير اليومي').setDescription(`### **ملخص التحضير**\n**التاريخ:** \`${dateString}\`\n**عدد المتواجدين:** \`${activeDuty.size}\`\n\n---\n### **قائمة المتواجدين**\n${activeStaffList}`).setColor('#1c1c1c').setFooter({ text: 'نظام التحضير اليومي المتطور' });
    if (URL_DUTY_PANEL_IMAGE && URL_DUTY_PANEL_IMAGE.startsWith('http')) embed.setImage(URL_DUTY_PANEL_IMAGE);
    return embed;
}

function generateChartUrl(points, hours, warnings) {
    const chartConfig = {
        type: 'doughnut',
        data: {
            labels: ['النقاط الإنتاجية', 'ساعات العمل', 'التحذيرات'],
            datasets: [{
                data: [points, hours, warnings * 10], 
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c'],
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: { position: 'top', labels: { font: { size: 14 }, color: '#fff' } },
                title: { display: true, text: 'ملخص كفاءة الموظف الفنية الحالية', color: '#fff', font: { size: 16 } }
            }
        }
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&bg=23272a`;
}

async function checkAndExecuteAutoPromotion(member, guild) {
    const allData = getPointsData();
    const userId = member.id;
    const currentPoints = allData.points[userId] || 0;
    const currentMinutes = allData.duty_hours[userId] || 0;

    for (const req of PROMOTION_REQUIREMENTS) {
        if (currentPoints >= req.requiredPoints && currentMinutes >= req.requiredMinutes && !member.roles.cache.has(req.roleId)) {
            await member.roles.add(req.roleId).catch(() => null);
            const promoEmbed = new EmbedBuilder()
                .setTitle('🚀 قرار ترقية تلقائي مستند على الكفاءة الرقمية')
                .setDescription(`نظراً لاستيفاء الموظف لمتطلبات الأداء الفني والإنتاجي بالسيرفر، تقرر ترقيته آلياً:`)
                .addFields(
                    { name: '🚑 الموظف المتميز:', value: `${member}`, inline: true },
                    { name: '📈 الرتبة الجديدة الممنوحة:', value: `**${req.name}**`, inline: true },
                    { name: '📊 رصيده الإجمالي:', value: `✨ **${currentPoints}** نقطة | ⏱️ **${Math.floor(currentMinutes / 60)}** ساعة عمل.` }
                ).setColor('#2ecc71').setTimestamp();

            const logChannel = guild.channels.cache.get(LOG_PROMOTION);
            if (logChannel) await logChannel.send({ embeds: [promoEmbed] });
            await member.send(`🎉 مبارك! تم ترقيتك تلقائياً إلى رتبة **${req.name}** نظير جهودك وساعات عملك الرائعة في قطاع الصحة.`).catch(() => null);
        }
    }
}

client.on('ready', () => {
    console.log(`✅ البوت جاهز ومكتمل بجميع ميزات الشرف التلقائي ونظام طلبات الإجازات: ${client.user.tag}`);

    // Backup تلقائي كل 24 ساعة
    setInterval(async () => {
        const logChannel = client.channels.cache.get(LOG_DUTY_CHANNEL);
        if (logChannel && fs.existsSync(POINTS_FILE)) {
            await logChannel.send({ content: '💾 **نسخة احتياطية تلقائية لنظام البيانات:**', files: [POINTS_FILE] }).catch(console.error);
        }
    }, 1000 * 60 * 60 * 24);

    // رادار الصوت (محدث لتخطي الموظفين الذين في إجازة رسمية معتمدة)
    setInterval(() => {
        const allData = getPointsData();
        activeDuty.forEach(async (data, userId) => {
            // إذا كان الموظف في قائمة الإجازات، يتخطاه الرادار حماية له
            if (allData.leave_users.includes(userId)) return;

            const guild = client.guilds.cache.first(); if (!guild) return;
            const member = await guild.members.fetch(userId).catch(() => null);
            const isNoVoice = !member?.voice?.channelId;
            const isMicMuted = member?.voice?.selfMute || member?.voice?.selfDeafen;

            if (isNoVoice || isMicMuted) {
                data.afkMinutes += 1; data.isAfk = true;
                if (data.afkMinutes === 15) {
                    await member.send(`⚠️ تنبيه عاجل: رادار الصوت يلاحظ أنك مكتوم (Muted)، يرجى فتح المايك لمنع تسجيل الخروج التلقائي بعد 5 دقائق!`).catch(() => null);
                }
                if (data.afkMinutes >= 20) { 
                    activeDuty.delete(userId);
                    const diffMins = Math.floor((Date.now() - data.startTime) / 60000) - 20;
                    if (diffMins > 0) {
                        allData.duty_hours[userId] = (allData.duty_hours[userId] || 0) + diffMins;
                        savePointsData(allData);
                    }
                    const logChannel = guild.channels.cache.get(LOG_DUTY_CHANNEL);
                    if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🚨 طرد تلقائي عبر رادار الصوت').setDescription(`تم إخراج ${member} من الخدمة بسبب كتم المايك أو التواجد الوهمي لـ 20 دقيقة.`).setColor('#e74c3c').setTimestamp()] });
                    await member.send(`🚨 قرار نظام: تم إلغاء شفتك الحالي بسبب كتم المايك المطول.`).catch(() => null);
                }
            } else { data.afkMinutes = 0; data.isAfk = false; }
        });
    }, 60000);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // نظام نشر التقارير التلقائي الجبار
    if (message.channelId === CHANNEL_ADMIN_REPORT_INPUT) {
        const reportContent = message.content.trim(); if (!reportContent) return;
        await message.delete().catch(() => null);
        const publicChannel = message.guild.channels.cache.get(CHANNEL_PUBLIC_REPORT_OUTPUT);
        if (!publicChannel) return;
        const chunks = reportContent.match(/[\s\S]{1,2000}/g) || [reportContent];
        for (let i = 0; i < chunks.length; i++) {
            const reportEmbed = new EmbedBuilder().setTitle(i === 0 ? '🚑 | بيان رسمي صادر عن إدارة قطاع الصحة' : '🚑 | تابع البيان الرسمي').setDescription(chunks[i]).setColor('#e74c3c').setFooter({ text: `حرر بواسطة الإداري: ${message.author.username}`, iconURL: message.author.displayAvatarURL() }).setTimestamp();
            if (i === 0) { await publicChannel.send({ content: '📢 @everyone | **تقرير إداري جديد عاجل يرجى القراءة والالتزام:**', embeds: [reportEmbed] }); } 
            else { await publicChannel.send({ embeds: [reportEmbed] }); }
        }
        return message.channel.send(`✅ **تم نشر تقريرك بنجاح وعمل منشن للجميع!**`).then(msg => setTimeout(() => msg.delete().catch(() => null), 5000));
    }

    // نظام روم الأسئلة
    if (message.channelId === CHANNEL_QUESTIONS) {
        const questionText = message.content.trim(); if (!questionText) return;
        await message.delete().catch(() => null);
        const adminChannel = message.guild.channels.cache.get(CHANNEL_ADMIN_ANSWERS);
        if (!adminChannel) return;
        const qEmbed = new EmbedBuilder().setTitle('❓ سؤال جديد يحتاج إلى إجابة').addFields({ name: '👤 المرسل:', value: `${message.author}`, inline: true }, { name: '💬 نص السؤال:', value: `\`\`\`text\n${questionText}\n\`\`\`` }).setColor('#f1c40f').setTimestamp();
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`answer_question_btn_${message.author.id}`).setLabel('📝 الإجابة على السؤال').setStyle(ButtonStyle.Primary));
        await adminChannel.send({ embeds: [qEmbed], components: [row] });
        return message.author.send(`✅ تم استلام سؤالك بنجاح وجاري مراجعته، سيصلك الجواب هنا بالخاص فوراً.`).catch(() => null);
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const allData = getPointsData();

    if (command === 'points' || command === 'duty-check') {
        const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null) || message.member;
        const pts = allData.points[targetMember.id] || 0; const mins = allData.duty_hours[targetMember.id] || 0; const warns = allData.warnings[targetMember.id] || 0; const hrs = Math.floor(mins / 60);
        const statsEmbed = new EmbedBuilder().setTitle(`📊 الملف الفني والبياني للموظف | ${targetMember.user.username}`).setDescription(`تفاصيل الإحصائيات التراكمية مستخرجة بنظام الرسوم البيانية المتطورة لايف:`).addFields({ name: '✨ النقاط الإنتاجية:', value: `**${pts}** نقطة`, inline: true }, { name: '⏳ ساعات العمل:', value: `**${hrs}** ساعة و **${mins % 60}** دقيقة`, inline: true }, { name: '⚠️ الإنذارات الحالية:', value: `**${warns}** تحذير رسمي`, inline: true }).setImage(generateChartUrl(pts, hrs, warns)).setColor('#3498db').setTimestamp();
        return message.reply({ embeds: [statsEmbed] });
    }

    // 🏆 [أمر لوحة الشرف التلقائي الجديد] 🏆
    if (command === 'leaderboard') {
        const sortedPoints = Object.entries(allData.points).sort((a, b) => b[1] - a[1]).slice(0, 3);
        let leaderboardText = "👑 **قائمة أفضل 3 مسعفين إنتاجية وكفاءة لهذا الأسبوع:**\n\n";
        const medals = ['🥇 المركز الأول', '🥈 المركز الثاني', '🥉 المركز الثالث'];
        
        if (sortedPoints.length === 0) leaderboardText += "*لا توجد بيانات مسجلة للنقاط حالياً.*";
        for (let i = 0; i < sortedPoints.length; i++) {
            leaderboardText += `${medals[i]}: <@${sortedPoints[i][0]}> \n✨ رصيد النقاط: **${sortedPoints[i][1]}** نقطة مسجلة.\n\n`;
        }
        const lbEmbed = new EmbedBuilder().setTitle('🏆 لوحة الشرف الأسبوعية لقطاع الصحة 🏆').setDescription(leaderboardText).setColor('#f1c40f').setThumbnail('https://i.imgur.com/E87C8b9.png').setTimestamp();
        return message.reply({ embeds: [lbEmbed] });
    }

    // بنل طلبات الإجازة والاستقالة المؤتمت
    if (command === 'setup-requests') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للإدارة فقط.');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_request_leave').setLabel('طلب إجازة رسمي 📅').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_request_resign').setLabel('تقديم استقالة 📝').setStyle(ButtonStyle.Danger)
        );
        const embed = new EmbedBuilder().setTitle('📅 مركز الطلبات الإدارية وشؤون الموظفين 📝').setDescription('عبر هذا البنل، يمكن لكافة منسوبي قطاع الصحة تقديم طلبات الإجازات الرسمية أو الاستقالات لتتم معالجتها آلياً من قِبل الإدارة العليا.').setColor('#2c3e50');
        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => null);
    }

    if (command === 'setup-duty') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للإدارة فقط.');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('duty_on_btn').setLabel('دخول الخدمة 🟢').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('duty_off_btn').setLabel('خروج من الخدمة 🔴').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('admin_panel_shortcut').setLabel('Affairs Options ⚙️').setStyle(ButtonStyle.Primary));
        await message.channel.send({ embeds: [createDutyEmbed(message.guild)], components: [row] });
        await message.delete().catch(() => null);
    }
    if (command === 'setup-dispatch') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للإدارة فقط.');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('dispatch_duty_on').setLabel('دخول فترة دسباتش 🟢').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('dispatch_duty_off').setLabel('خروج فترة دسباتش 🔴').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('open_dispatch_modal').setLabel('توزيع الـ Zones الذكي 🗺️').setStyle(ButtonStyle.Primary));
        await message.channel.send({ embeds: [new EmbedBuilder().setTitle('🚑 مركز عمليات قطاع الصحة | Medical Dispatch Panel').setDescription('استخدم الأزرار أدناه لإدارة فترة الدسباتش وتوزيع الـ Zones ديناميكياً.').setColor('#e74c3c')], components: [row] });
        await message.delete().catch(() => null);
    }
    if (command === 'setup-apply') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للإدارة فقط.');
        const embed = new EmbedBuilder().setTitle('🚑 التتقديم على وزارة الصحة (EMS) 🚑').setDescription('اضغط على الزر أدناه لتعبئة استمارة الانضمام الإلكترونية بالكامل.').setColor('#e74c3c');
        if (URL_APPLY_PANEL_IMAGE && URL_APPLY_PANEL_IMAGE.startsWith('http')) embed.setImage(URL_APPLY_PANEL_IMAGE);
        await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ems_apply_btn').setLabel('تقديم الآن 📝').setStyle(ButtonStyle.Danger))] });
        await message.delete().catch(() => null);
    }
    if (command === 'add-zone') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للإدارة فقط.');
        const zoneName = args.join(' '); if (!zoneName) return;
        if (allData.custom_zones.includes(zoneName)) return;
        allData.custom_zones.push(zoneName); savePointsData(allData);
        return message.reply(`✅ تم إضافة **[ ${zoneName} ]** بنجاح!`);
    }
    if (command === 'remove-zone') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ للإدارة فقط.');
        const zoneName = args.join(' '); if (!zoneName) return;
        allData.custom_zones = allData.custom_zones.filter(z => z !== zoneName); savePointsData(allData);
        return message.reply(`🗑️ تم حذف المنطقة بنجاح.`);
    }
});

// ================= [ معالجة التفاعلات والأزرار ونظام الإجازات ] =================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const { customId, user, guild } = interaction;

        // فتح مودال الإجازة
        if (customId === 'btn_request_leave') {
            const modal = new ModalBuilder().setCustomId('modal_submit_leave').setTitle('📅 نموذج طلب إجازة رسمية');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('leave_duration').setLabel('مدة الإجازة المطلوبة (أيام):').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('leave_reason').setLabel('السبب الحقيقي لطلب الإجازة:').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // فتح مودال الاستقالة
        if (customId === 'btn_request_resign') {
            const modal = new ModalBuilder().setCustomId('modal_submit_resign').setTitle('📝 نموذج تقديم استقالة رسمية');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('resign_reason').setLabel('أسباب الاستقالة من قطاع الصحة:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(modal);
        }

        // أزرار اتخاذ القرار للإجازات والاستقالات من الإدارة
        if (customId.startsWith('decision_leave_') || customId.startsWith('decision_resign_')) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ مخصص لإدارة شؤون الموظفين فقط.', ephemeral: true });
            const parts = customId.split('_');
            const action = parts[1]; // accept or reject
            const type = parts[0] === 'decision_leave' ? 'leave' : 'resign';
            const applicantId = parts[2];
            const applicant = await guild.members.fetch(applicantId).catch(() => null);

            await interaction.message.delete().catch(() => null);
            const allData = getPointsData();

            if (action === 'accept') {
                if (type === 'leave') {
                    if (!allData.leave_users.includes(applicantId)) allData.leave_users.push(applicantId);
                    savePointsData(allData);
                    if (applicant) {
                        if (ROLE_LEAVE.length > 5) await applicant.roles.add(ROLE_LEAVE).catch(() => null);
                        await applicant.send(`🟢 **تم الموافقة على طلب إجازتك رسمياً.** نظام رادار الصوت لن يقوم بطردك تلقائياً الآن لحين انتهاء مدتك.`).catch(() => null);
                    }
                    const ch = guild.channels.cache.get(LOG_APPLY_DECISION);
                    if (ch) await ch.send(`🟢 تم اعتماد إجازة العضو <@${applicantId}> بواسطة ${user}`);
                } else {
                    if (applicant) {
                        const allEmsRoleIds = [ROLE_WARN_1, ROLE_WARN_2, ROLE_WARN_3, ROLE_LEAVE, ...EMS_ROLES.map(r => r.value)].filter(id => id.length > 5);
                        await applicant.roles.remove(allEmsRoleIds).catch(() => null);
                        await applicant.send(`🔴 **تم قبول طلب استقالتك رسميًا من قطاع الصحة وتم سحب الصلاحيات الرتب، نتمنى لك التوفيق.**`).catch(() => null);
                    }
                    const ch = guild.channels.cache.get(LOG_FIRE);
                    if (ch) await ch.send(`❌ تم قبول استقالة العضو <@${applicantId}> ومسح رتبه بواسطة ${user}`);
                }
            } else {
                if (applicant) await applicant.send(`❌ **نأسف، تم رفض طلبك (إجازة/استقالة) من قِبل إدارة شؤون الموظفين، يرجى مراجعة المسؤول.**`).catch(() => null);
            }
            return interaction.reply({ content: '✅ تم قيد واعتماد القرار وإرسال الإشعار بنجاح!', ephemeral: true });
        }

        if (customId.startsWith('answer_question_btn_')) {
            const applicantId = customId.replace('answer_question_btn_', '');
            const modal = new ModalBuilder().setCustomId(`modal_answer_submit_${applicantId}`).setTitle('📝 الإجابة على السؤال');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('answer_text_input').setLabel('اكتب تفاصيل الإجابة بوضوح هنا:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId === 'duty_on_btn') {
            if (activeDuty.has(user.id)) return interaction.reply({ content: '⚠️ مسجل دخول مسبقاً!', ephemeral: true });
            
            // إلغاء حالة الإجازة تلقائياً بمجرد رغبة الشخص في النزول للديوتي والعمل حياً
            const allData = getPointsData();
            if (allData.leave_users.includes(user.id)) {
                allData.leave_users = allData.leave_users.filter(id => id !== user.id); savePointsData(allData);
                if (interaction.member.roles.cache.has(ROLE_LEAVE)) await interaction.member.roles.remove(ROLE_LEAVE).catch(() => null);
            }

            activeDuty.set(user.id, { startTime: Date.now(), afkMinutes: 0, isAfk: false });
            await interaction.message.edit({ embeds: [createDutyEmbed(guild)] });
            const logChannel = guild.channels.cache.get(LOG_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🟢 تسجيل دخول موظف (On Duty)').setDescription(`🚑 الموظف: ${user}\n⏰ التوقيت: <t:${Math.floor(Date.now() / 1000)}:F>`).setColor('#2ecc71')] });
            return interaction.reply({ content: '🟢 تم تسجيل دخولك بنجاح! تم فحص وإلغاء إجازتك آلياً لعودتك لميدان العمل الحقيقي بالتوفيق.', ephemeral: true });
        }

        if (customId === 'duty_off_btn') {
            if (!activeDuty.has(user.id)) return interaction.reply({ content: '⚠️ أنت لست مسجلاً بالخدمة حالياً!', ephemeral: true });
            const data = activeDuty.get(user.id); activeDuty.delete(user.id);
            await interaction.message.edit({ embeds: [createDutyEmbed(guild)] });
            const diffMins = Math.floor((Date.now() - data.startTime) / 60000);
            const allData = getPointsData(); allData.duty_hours[user.id] = (allData.duty_hours[user.id] || 0) + diffMins; savePointsData(allData);
            const logChannel = guild.channels.cache.get(LOG_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🔴 تسجيل خروج موظف (Off Duty)').setDescription(`🚑 الموظف: ${user}\n⏳ مدة المناوبة: **${Math.floor(diffMins / 60)}** ساعة`).setColor('#e74c3c')] });
            await checkAndExecuteAutoPromotion(interaction.member, guild);
            return interaction.reply({ content: `🔴 تم تسجيل خروجك بنجاح وجرى فحص رصيدك للترقيات المتاحة.`, ephemeral: true });
        }

        if (customId === 'dispatch_duty_on') {
            if (activeDispatchDuty.has(user.id)) return interaction.reply({ content: '⚠️ مسجل دخول مسبقاً بفترة دسباتش!', ephemeral: true });
            activeDispatchDuty.set(user.id, Date.now());
            const logChannel = guild.channels.cache.get(LOG_DISPATCH_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🟢 بدء فترة دسباتش').setDescription(`👮 المسؤول: ${user}`).setColor('#2ecc71')] });
            return interaction.reply({ content: '🟢 تم بدء فترة الدسباتش بنجاح وبدء احتساب الشفت!', ephemeral: true });
        }

        if (customId === 'dispatch_duty_off') {
            if (!activeDispatchDuty.has(user.id)) return interaction.reply({ content: '⚠️ لست مسجلاً بالخدمة!', ephemeral: true });
            const startTime = activeDispatchDuty.get(user.id); activeDispatchDuty.delete(user.id);
            const diffMins = Math.floor((Date.now() - startTime) / 60000);
            const allData = getPointsData(); allData.dispatch_duty_hours[user.id] = (allData.dispatch_duty_hours[user.id] || 0) + diffMins; savePointsData(allData);
            const logChannel = guild.channels.cache.get(LOG_DISPATCH_DUTY_CHANNEL);
            if (logChannel) await logChannel.send({ embeds: [new EmbedBuilder().setTitle('🔴 انتهاء فترة دسباتش').setDescription(`👮 المسؤول: ${user}\n⏳ المستغرق: **${Math.floor(diffMins / 60)}** ساعة`).setColor('#e74c3c')] });
            return interaction.reply({ content: `🔴 تم إنهاء فترة الدسباتش بنجاح وحفظ ساعات القيادة.`, ephemeral: true });
        }

        if (customId === 'open_dispatch_modal') {
            if (!activeDispatchDuty.has(user.id)) return interaction.reply({ content: '❌ يجب عليك تسجيل دخول فترة الدسباتش أولاً!', ephemeral: true });
            const currentStaffIds = Array.from(activeDuty.keys());
            if (currentStaffIds.length === 0) return interaction.reply({ content: '⚠️ لا يوجد أي موظف مسجل دخول (On Duty) حالياً لتوزيعه!', ephemeral: true });
            const staffOptions = [];
            for (const staffId of currentStaffIds) {
                const member = await guild.members.fetch(staffId).catch(() => null);
                if (member) staffOptions.push({ label: member.displayName || member.user.username, value: staffId, description: `الـ ID: ${staffId}` });
            }
            staffOptions.push({ label: '❌ لا يوجد موظف متاح لهذه المنطقة', value: 'empty_zone', description: 'إبقاء المنطقة شاغرة مؤقتاً' });
            const allData = getPointsData(); const currentZones = allData.custom_zones;
            if (currentZones.length === 0) return interaction.reply({ content: '⚠️ اللوحة فارغة، لا توجد مناطق مضافة بالسيرفر.', ephemeral: true });
            
            const setupEmbed = new EmbedBuilder().setTitle('🗺️ لوحة توزيع المناطق الطبية الديناميكية').setDescription(`قم بتحديد الموظف لكل منطقة من القوائم أدناه بشكل دقيق ومباشر.`).setColor('#3498db').setTimestamp();
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
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ ليس لديك صلاحية اتخاذ القرار في التتقديمات.', ephemeral: true });
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

            if (actionType === 'warn' || actionType === 'fire' || customId.includes('remove')) {
                const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
                securityOtps.set(user.id, otpCode);

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

    if (interaction.isModalSubmit()) {
        const { customId, fields, guild, user } = interaction;

        // استلام طلب الإجازة وإرساله للإدارة
        if (customId === 'modal_submit_leave') {
            const duration = fields.getTextInputValue('leave_duration');
            const reason = fields.getTextInputValue('leave_reason');
            const logChannel = guild.channels.cache.get(CHANNEL_APPLY_LOG);

            const embed = new EmbedBuilder().setTitle('📅 طلب إجازة رسمية جديد يحتاج مراجعة').addFields({ name: '🚑 الموظف المتقدم:', value: `${user}`, inline: true }, { name: '⏳ المدة المطلوبة:', value: `**${duration} أيام**`, inline: true }, { name: '📝 الأسباب والبيان:', value: `\`\`\`text\n${reason}\n\`\`\`` }).setColor('#3498db').setTimestamp();
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`decision_leave_accept_${user.id}`).setLabel('قبول واعتماد الإجازة 🟢').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`decision_leave_reject_${user.id}`).setLabel('رفض الطلب 🔴').setStyle(ButtonStyle.Danger)
            );
            if (logChannel) await logChannel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: '✅ تم إرسال نموذج طلب إجازتك بنجاح وجاري تدقيقه من شؤون الموظفين بالإدارة.', ephemeral: true });
        }

        // استلام طلب الاستقالة وإرساله للإدارة
        if (customId === 'modal_submit_resign') {
            const reason = fields.getTextInputValue('resign_reason');
            const logChannel = guild.channels.cache.get(CHANNEL_APPLY_LOG);

            const embed = new EmbedBuilder().setTitle('📝 طلب استقالة رسمي عاجل').addFields({ name: '🚑 العضو المتقدم:', value: `${user}` }, { name: '📝 الأسباب والمبررات:', value: `\`\`\`text\n${reason}\n\`\`\`` }).setColor('#c0392b').setTimestamp();
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`decision_resign_accept_${user.id}`).setLabel('قبول الاستقالة ومسح الرتب ❌').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`decision_resign_reject_${user.id}`).setLabel('رفض الطلب 🔴').setStyle(ButtonStyle.Secondary)
            );
            if (logChannel) await logChannel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: '✅ تم إرسال طلب استقالتك رسمياً وشطب الصلاحيات قيد المراجعة الإدارية الكبرى.', ephemeral: true });
        }

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

        if (customId.startsWith('modal_direct_')) {
            const actionFull = customId.replace('modal_direct_admin_', '');
            const targetId = fields.getTextInputValue('target_id');
            const reasonOrValue = fields.getTextInputValue('reason_value');
            const targetMember = await guild.members.fetch(targetId).catch(() => null);
            if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود بالسيرفر.', ephemeral: true });

            if (actionFull === 'warn' || actionFull === 'fire' || actionFull.includes('remove')) {
                const userOtpInput = fields.getTextInputValue('security_otp_input');
                const savedOtp = securityOtps.get(user.id); securityOtps.delete(user.id);
                if (!savedOtp || userOtpInput !== savedOtp) return interaction.reply({ content: '❌ رمز التحقق الأمني خاطئ! تم إلغاء العملية لحماية النظام.', ephemeral: true });
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
                const allEmsRoleIds = [ROLE_WARN_1, ROLE_WARN_2, ROLE_WARN_3, ROLE_LEAVE, ...EMS_ROLES.map(r => r.value)].filter(id => id.length > 5);
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
            
            await checkAndExecuteAutoPromotion(targetMember, guild);
            return interaction.reply({ content: `✅ تم تنفيذ الإجراء بنجاح وتحديث نظام البيانات ومحرك الترقيات التلقائي!`, ephemeral: true });
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
            
            await checkAndExecuteAutoPromotion(targetMember, guild);
            return interaction.reply({ content: `✅ تم تسجيل خروج الموظف وحفظ ساعاته وفحص ملف ترقياته آلياً!`, ephemeral: true });
        }
    }
});

client.on('error', console.error);
client.login(process.env.BOT_TOKEN);
