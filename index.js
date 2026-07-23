// ================================================
// 🤖 B3R RP — البوت الموحد (Tickets + Whitelist + Accept/Reject)
//    Discord Coding Store | Claude Powered
// ================================================

const {
    Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder,
    REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    PermissionFlagsBits, ChannelType
} = require('discord.js');
const fs = require('fs');

// ============================================================
// ✅ الإعدادات — Environment Variables (Railway)
// ============================================================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // روم اللوجز (اختياري، مشترك بين الأنظمة)

// --- نظام التذاكر (Tickets) ---
const TICKETS_CATEGORY_ID = process.env.TICKETS_CATEGORY_ID;
const TICKETS_ADMIN_ROLE_ID = process.env.TICKETS_ADMIN_ROLE_ID;

// --- نظام المقابلة (Whitelist Interview) ---
const INTERVIEW_CATEGORY_ID = process.env.INTERVIEW_CATEGORY_ID;
const CITIZEN_ROLE_ID = process.env.CITIZEN_ROLE_ID;
const INTERVIEW_ADMIN_ROLE_ID = process.env.INTERVIEW_ADMIN_ROLE_ID;

// --- نظام القبول/الرفض السريع (Accept/Reject) ---
const WHITELIST_ROLE_ID = process.env.WHITELIST_ROLE_ID;
const APPLICATION_TEAM_ROLE_ID = process.env.APPLICATION_TEAM_ROLE_ID;
const REJECT_ROLE_1_ID = process.env.REJECT_ROLE_1_ID;
const REJECT_ROLE_2_ID = process.env.REJECT_ROLE_2_ID;
const REJECT_PERMANENT_ROLE_ID = process.env.REJECT_PERMANENT_ROLE_ID;

// ============================================================
// ✅ قواعد البيانات (كل نظام بملفه عشان محدش يتعارض مع التاني)
// ============================================================
function loadDB(path) {
    if (!fs.existsSync(path)) fs.writeFileSync(path, '{}');
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}
function saveDB(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

const TICKETS_DB_PATH = './tickets.json';
const INTERVIEW_DB_PATH = './database.json';

// ============================================================
// ✅ نظام التذاكر — البيانات الثابتة
// ============================================================
const TICKET_TYPES = [
    { id: 'compensation', label: 'تعويضات', emoji: '💰', title: 'تعويضات 💰', description: 'لتقديم طلب تعويض عن فقدان ممتلكات أو خسارة ناتجة عن خطأ أو مشكلة داخل السيرفر.' },
    { id: 'car_compensation', label: 'تعويض سيارة', emoji: '🚗', title: 'تعويض سيارة 🚗', description: 'لتقديم طلب تعويض عن فقدان أو تلف سيارة ناتج عن خطأ أو مشكلة داخل السيرفر.' },
    { id: 'management', label: 'الإدارة', emoji: '🛡️', title: 'الإدارة 🛡️', description: 'استفسارات ومخالطة إدارة السيرفر.' },
    { id: 'complaint', label: 'شكوى', emoji: '📢', title: 'شكوى 📢', description: 'لتقديم شكوى ضد لاعب أو موقف حصل معاك داخل السيرفر.' },
    { id: 'luxury', label: 'رفاهية', emoji: '🎁', title: 'رفاهية 🎁', description: 'لطلبات الرفاهية والدعم (تبرعات، مميزات إضافية، وغيرها).' },
    { id: 'store', label: 'متجر', emoji: '🛒', title: 'متجر 🛒', description: 'لأي استفسار أو مشكلة متعلقة بالمتجر أو عمليات الشراء.' },
    { id: 'tech_support', label: 'دعم فني', emoji: '🛠️', title: 'دعم فني 🛠️', description: 'للإبلاغ عن مشاكل تقنية أو أخطاء داخل السيرفر أو الديسكورد.' },
    { id: 'other', label: 'أخرى', emoji: '❓', title: 'أخرى ❓', description: 'لأي استفسارات أخرى.' }
];

// ============================================================
// ✅ نظام المقابلة — الأسئلة الثابتة
// ============================================================
const QUESTIONS = [
    { title: '1️⃣ السؤال الأول — التعريف بالشخصية', text: 'اكتب اسم شخصيتك الكامل (الاسم الأول والأخير) واللي هتستخدمه في الرولبلاي.' },
    { title: '2️⃣ السؤال الثاني — تعريف الرولبلاي', text: 'إيه هو الرولبلاي بالنسبة لك؟ اشرح بكلامك الخاص.' },
    { title: '3️⃣ السؤال الثالث — تعريف قصة الشخصية', text: 'اكتب قصة شخصيتك الاساسية و يجب ان لا تقل عن 150 كلمة.' },
    { title: '4️⃣ السؤال الرابع — معنى ForcedRP', text: 'إيه معنى "ForcedRP" وليه ممنوع في السيرفر؟' },
    { title: '5️⃣ السؤال الخامس — معنى Meta Gaming', text: 'إيه الفرق بين "Meta Gaming" و"In-Character / Out-of-Character"؟ اشرح بمثال.' },
    { title: '6️⃣ السؤال السادس — موقف RP', text: 'لو شخصيتك في السيرفر اتعرضت لحادث وكسرت رجلها، إزاي هتتعامل مع الموقف من ناحية الرولبلاي؟' },
    { title: '7️⃣ السؤال السابع — السرقة والقتل', text: 'إيه القوانين اللي بتحكم السرقة أو القتل في السيرفر؟ ولازم يكون فيه إيه قبل ما حد يعمل أي منهم؟' },
    { title: '8️⃣ السؤال التامن — Fail RP', text: 'وضّح معنى "Fail RP" واديني مثال واحد عليه.' },
    { title: '9️⃣ السؤال التاسع — مخالفة قانون لحظة دخولك', text: 'لو شفت لاعب تاني بيعمل مخالفة واضحة للقوانين قدامك، هتعمل إيه؟' },
    { title: '1️⃣0️⃣ السؤال العاشر — RDM/VDM', text: 'وضّح معنى "RDM/VDM" واديني مثالين عليه.' },
];
const activeInterviews = new Map(); // channelId -> { userId, currentQuestion, answers }

// ============================================================
// ✅ تشغيل البوت
// ============================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ============================================================
// ✅ كل الأوامر مجمعة سوا
// ============================================================
const commands = [
    new SlashCommandBuilder()
        .setName('tickets-setup')
        .setDescription('إنشاء رسالة فتح التذاكر (للأدمن فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('whitelist-setup')
        .setDescription('إنشاء رسالة بدء المقابلة (للأدمن فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('whitelist-reset')
        .setDescription('تصفير حالة تيكت يوزر معين يدوياً (للأدمن فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => option.setName('user').setDescription('اليوزر اللي هتصفّر حالته').setRequired(true)),

    new SlashCommandBuilder()
        .setName('accept')
        .setDescription('قبول تقديم لاعب وإعطاؤه رول الـ Whitelist')
        .addUserOption(option => option.setName('player').setDescription('اللاعب اللي هيتقبل تقديمه').setRequired(true)),

    new SlashCommandBuilder()
        .setName('reject')
        .setDescription('رفض تقديم لاعب')
        .addUserOption(option => option.setName('player').setDescription('اللاعب اللي هيترفض تقديمه').setRequired(true))
];

client.once('ready', async () => {
    console.log(`✅ البوت شغال: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ الأوامر اتسجلت!');
    } catch (err) {
        console.error('❌ خطأ في تسجيل الأوامر:', err);
    }
});

function isStaff(interaction, roleId) {
    const hasRole = roleId ? interaction.member.roles.cache.has(roleId) : false;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    return hasRole || isAdmin;
}

// ============================================================
// ✅ نظام التذاكر — الـ Embeds والأزرار
// ============================================================
function buildTicketsEmbed() {
    const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle('🎫 نظام التذاكر — B3R RP')
        .setFooter({ text: 'B3R RP | نظام التذاكر' });

    TICKET_TYPES.forEach(t => {
        embed.addFields({ name: t.title, value: `${t.description}\nاضغط الزر لإنشاء تذكرة من نوع ${t.label}` });
    });
    return embed;
}

function buildTicketButtons() {
    const rows = [];
    for (let i = 0; i < TICKET_TYPES.length; i += 5) {
        const row = new ActionRowBuilder();
        TICKET_TYPES.slice(i, i + 5).forEach(t => {
            row.addComponents(
                new ButtonBuilder().setCustomId(`open_ticket_${t.id}`).setLabel(t.label).setEmoji(t.emoji).setStyle(ButtonStyle.Secondary)
            );
        });
        rows.push(row);
    }
    return rows;
}

function buildCloseTicketRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التذكرة').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    );
}

// ============================================================
// ✅ نظام المقابلة — الـ Embeds والأزرار
// ============================================================
function buildWelcomeEmbed(guild) {
    const embed = new EmbedBuilder()
        .setColor('#CC0000')
        .setTitle('🪪 أهلاً بيك في B3R RP')
        .setDescription('يسعدنا انضمامك لمجتمعنا! قبل ما تبدأ، خد بالك من الآتي 👇')
        .addFields(
            { name: '📋 خطوات المقابلة', value: '`1` اضغط على الزرار تحت وهيتفتحلك تيكت خاص\n`2` هتوصلك أسئلة واحد ورا التاني\n`3` جاوب كل سؤال برسالة منفصلة وبالتفصيل' },
            { name: '📖 قبل ما تبدأ', value: '• اتأكد إنك قريت **قوانين السيرفر** كاملة\n• جاوب بصدق ووضوح، الإجابات المفصلة بتفرق معانا\n• بعد ما تخلص، فريق الإدارة هيراجع إجاباتك ويرد عليك' }
        )
        .setFooter({ text: 'B3R RP • نظام الـ Whitelist' })
        .setTimestamp();

    if (guild) embed.setThumbnail(guild.iconURL());
    return embed;
}

function buildQuestionEmbed(index) {
    const q = QUESTIONS[index];
    return new EmbedBuilder().setColor('#CC0000').setTitle(q.title).setDescription(q.text)
        .setFooter({ text: `السؤال ${index + 1} من ${QUESTIONS.length} | B3R RP` });
}

function buildSummaryEmbed(member, answers) {
    const embed = new EmbedBuilder()
        .setColor('#CC0000')
        .setTitle('📋 ملخص إجابات المقابلة')
        .setDescription(`اللاعب: <@${member.id}>\nمرر على الإجابات وقرر القبول أو الرفض 👇`)
        .setFooter({ text: 'B3R RP | نظام Whitelist' })
        .setTimestamp();

    QUESTIONS.forEach((q, i) => {
        embed.addFields({ name: q.title, value: answers[i] ? `\`\`${answers[i]}\`\`` : '`لم يتم الرد`' });
    });
    return embed;
}

function buildInterviewResultEmbed(accepted) {
    if (accepted) {
        return new EmbedBuilder()
            .setColor('#00CC44')
            .setTitle('✅ تم قبول طلبك!')
            .setDescription('مبروك تم قبولك مبدأياً في مدينة **B3R RP**.\n\nيمكنك الانتظار إلى أقرب مقابلة صوتية 🎉')
            .setFooter({ text: 'B3R RP | نظام Whitelist' })
            .setTimestamp();
    }
    return new EmbedBuilder()
        .setColor('#CC0000')
        .setTitle('❌ تم رفض طلبك')
        .setDescription('نأسف، تم رفض طلب الـ Whitelist بتاعك في **B3R RP**.\n\nيمكنك مراجعة قوانين السيرفر وإعادة التقديم بعد فترة من خلال فتح مقابلة جديدة.')
        .setFooter({ text: 'B3R RP | نظام Whitelist' })
        .setTimestamp();
}

function buildInterviewLogEmbed(member, answers, accepted, decidedBy) {
    const embed = new EmbedBuilder()
        .setColor(accepted ? '#00CC44' : '#CC0000')
        .setTitle(accepted ? '✅ تم قبول طلب Whitelist' : '❌ تم رفض طلب Whitelist')
        .setDescription(`**اللاعب:** <@${member.id}> (${member.user.tag})\n**القرار بواسطة:** <@${decidedBy}>\n**الحالة:** ${accepted ? 'مقبول ✅' : 'مرفوض ❌'}`)
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: 'B3R RP | سجل المقابلات' })
        .setTimestamp();

    QUESTIONS.forEach((q, i) => {
        embed.addFields({ name: q.title, value: answers[i] ? `\`\`${answers[i]}\`\`` : '`لم يتم الرد`' });
    });
    return embed;
}

// ============================================================
// ✅ كل التفاعلات (Slash Commands + Buttons) في مكان واحد
// ============================================================
client.on('interactionCreate', async (interaction) => {

    // ──────────────────────────────────────────
    // 🎫 SLASH: /tickets-setup
    // ──────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'tickets-setup') {
        await interaction.channel.send({ embeds: [buildTicketsEmbed()], components: buildTicketButtons() });
        await interaction.reply({ content: '✅ تم إنشاء رسالة التذاكر.', ephemeral: true });
        return;
    }

    // ──────────────────────────────────────────
    // 🪪 SLASH: /whitelist-setup
    // ──────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'whitelist-setup') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('start_interview').setLabel('ابدأ المقابلة').setEmoji('🪪').setStyle(ButtonStyle.Success)
        );
        await interaction.channel.send({ embeds: [buildWelcomeEmbed(interaction.guild)], components: [row] });
        await interaction.reply({ content: '✅ تم إنشاء رسالة المقابلة.', ephemeral: true });
        return;
    }

    // ──────────────────────────────────────────
    // 🪪 SLASH: /whitelist-reset
    // ──────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'whitelist-reset') {
        const targetUser = interaction.options.getUser('user');
        const db = loadDB(INTERVIEW_DB_PATH);

        if (!db[targetUser.id]) {
            return interaction.reply({ content: `⚠️ مفيش تيكت محفوظ لـ <@${targetUser.id}> أصلاً.`, ephemeral: true });
        }

        const oldChannelId = db[targetUser.id].channelId;
        delete db[targetUser.id];
        saveDB(INTERVIEW_DB_PATH, db);
        activeInterviews.delete(oldChannelId);

        return interaction.reply({ content: `✅ تم تصفير حالة <@${targetUser.id}>، يقدر يفتح تيكت جديد دلوقتي.`, ephemeral: true });
    }

    // ──────────────────────────────────────────
    // ✅ SLASH: /accept
    // ──────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'accept') {
        if (!isStaff(interaction, APPLICATION_TEAM_ROLE_ID)) {
            return interaction.reply({ content: '❌ الأمر ده لفريق التقديمات بس.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('player');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ content: '❌ مش لاقي اللاعب ده في السيرفر.', ephemeral: true });
        }

        try {
            await targetMember.roles.add(WHITELIST_ROLE_ID);
        } catch (err) {
            console.error('❌ خطأ في إضافة الرول:', err);
            return interaction.reply({ content: '❌ حصل خطأ وأنا بحاول أدي الرول، تأكد إن رتبة البوت فوق رول الـ Whitelist.', ephemeral: true });
        }

        const acceptEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ Application Accepted')
            .setDescription(`Congratulations ${targetUser}! You have been **accepted** into B3R RP!`)
            .addFields(
                { name: '👤 Player', value: `${targetUser}`, inline: true },
                { name: '🛡️ Staff', value: `${interaction.user}`, inline: true },
                { name: '🟢 Role', value: `<@&${WHITELIST_ROLE_ID}>`, inline: true }
            )
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: 'B3R RP — Application System' })
            .setTimestamp();

        await interaction.reply({ embeds: [acceptEmbed] });

        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🎉 مبروك، تم قبولك في B3R RP!')
                .setDescription('تقديمك اتقبل، وانت جاهز تدخل السيرفر في أي وقت. متشرفين بيك معانا! 🟣')
                .setFooter({ text: 'B3R RP — Application System' })
                .setTimestamp();
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (err) {
            console.log('⚠️ متقدرش يبعت رسالة خاصة للاعب.');
        }

        if (LOG_CHANNEL_ID) {
            try {
                const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
                await logChannel.send({ content: `✅ <@${interaction.user.id}> قبل تقديم <@${targetUser.id}> وديله رول الـ Whitelist.` });
            } catch (err) {
                console.error('❌ خطأ في إرسال اللوج:', err);
            }
        }
        return;
    }

    // ──────────────────────────────────────────
    // ❌ SLASH: /reject
    // ──────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'reject') {
        if (!isStaff(interaction, APPLICATION_TEAM_ROLE_ID)) {
            return interaction.reply({ content: '❌ الأمر ده لفريق التقديمات بس.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('player');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ content: '❌ مش لاقي اللاعب ده في السيرفر.', ephemeral: true });
        }

        const hasReject1 = targetMember.roles.cache.has(REJECT_ROLE_1_ID);
        const hasReject2 = targetMember.roles.cache.has(REJECT_ROLE_2_ID);

        let rejectStage = 1;
        let dmDescription = 'للأسف تم رفض تقديمك. تقدر تنتظر وتتقدم تاني لمقابلة صوتية جديدة قريبًا.';
        let logStage = 'رفض أول مرة';

        try {
            if (hasReject2) {
                rejectStage = 3;
                await targetMember.roles.remove(REJECT_ROLE_2_ID).catch(() => {});
                await targetMember.roles.add(REJECT_PERMANENT_ROLE_ID);
                dmDescription = 'للأسف وصلت لعدد المحاولات المسموح بيها، وتم رفض تقديمك بشكل **دائم**. مينفعش تتقدم تاني بعد كده.';
                logStage = 'رفض دائم (تالت مرة)';
            } else if (hasReject1) {
                rejectStage = 2;
                await targetMember.roles.remove(REJECT_ROLE_1_ID).catch(() => {});
                await targetMember.roles.add(REJECT_ROLE_2_ID);
                dmDescription = 'للأسف تم رفض تقديمك مرة تانية. تقدر تنتظر وتتقدم تاني لمقابلة صوتية جديدة قريبًا، بس خد بالك المرة الجاية آخر فرصة.';
                logStage = 'رفض تاني مرة';
            } else {
                rejectStage = 1;
                await targetMember.roles.add(REJECT_ROLE_1_ID);
            }
        } catch (err) {
            console.error('❌ خطأ في تعديل رولات الرفض:', err);
            return interaction.reply({ content: '❌ حصل خطأ وأنا بحاول أعدل الرولات، تأكد إن رتبة البوت فوق رولات الرفض.', ephemeral: true });
        }

        const rejectEmbed = new EmbedBuilder()
            .setColor(rejectStage === 3 ? '#7f0000' : '#e74c3c')
            .setTitle(rejectStage === 3 ? '⛔ Application Permanently Rejected' : '❌ Application Rejected')
            .setDescription(`${targetUser}, ${rejectStage === 3 ? 'تم رفض تقديمك بشكل دائم.' : 'للأسف تم رفض تقديمك، وتقدر تحاول تاني قريبًا.'}`)
            .addFields(
                { name: '👤 Player', value: `${targetUser}`, inline: true },
                { name: '🛡️ Staff', value: `${interaction.user}`, inline: true },
                { name: '📊 Stage', value: `${rejectStage}/3`, inline: true }
            )
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: 'B3R RP — Application System' })
            .setTimestamp();

        await interaction.reply({ embeds: [rejectEmbed] });

        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(rejectStage === 3 ? '#7f0000' : '#e74c3c')
                .setTitle(rejectStage === 3 ? '⛔ رفض دائم' : '❌ تم رفض تقديمك')
                .setDescription(dmDescription)
                .setFooter({ text: 'B3R RP — Application System' })
                .setTimestamp();
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (err) {
            console.log('⚠️ متقدرش يبعت رسالة خاصة للاعب.');
        }

        if (LOG_CHANNEL_ID) {
            try {
                const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
                await logChannel.send({ content: `❌ <@${interaction.user.id}> رفض تقديم <@${targetUser.id}> — ${logStage}.` });
            } catch (err) {
                console.error('❌ خطأ في إرسال اللوج:', err);
            }
        }
        return;
    }

    // ──────────────────────────────────────────
    // 🎫 BUTTON: فتح تذكرة
    // ──────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('open_ticket_')) {
        const typeId = interaction.customId.replace('open_ticket_', '');
        const type = TICKET_TYPES.find(t => t.id === typeId);
        if (!type) return;

        const db = loadDB(TICKETS_DB_PATH);
        const key = `${interaction.user.id}`;

        const existing = db[key];
        if (existing && existing.status === 'open') {
            return interaction.reply({ content: `⚠️ عندك تذكرة مفتوحة بالفعل: <#${existing.channelId}>`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const ticketChannel = await interaction.guild.channels.create({
            name: `${type.label}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: TICKETS_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: TICKETS_ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        db[key] = { channelId: ticketChannel.id, type: type.id, status: 'open', createdAt: new Date().toISOString() };
        saveDB(TICKETS_DB_PATH, db);

        const openEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`${type.emoji} تذكرة ${type.label}`)
            .setDescription(`أهلاً <@${interaction.user.id}> 👋\n\n${type.description}\n\nاشرح مشكلتك أو طلبك بالتفصيل وانتظر رد فريق الإدارة.`)
            .setFooter({ text: 'B3R RP | نظام التذاكر' })
            .setTimestamp();

        await ticketChannel.send({
            content: `<@${interaction.user.id}> | <@&${TICKETS_ADMIN_ROLE_ID}>`,
            embeds: [openEmbed],
            components: [buildCloseTicketRow()]
        });

        await interaction.editReply({ content: `✅ تم فتح تذكرتك: <#${ticketChannel.id}>` });

        if (LOG_CHANNEL_ID) {
            try {
                const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
                await logChannel.send({ content: `🎫 تذكرة جديدة (${type.label}) بواسطة <@${interaction.user.id}> — <#${ticketChannel.id}>` });
            } catch (err) {
                console.error('❌ خطأ في إرسال اللوج:', err);
            }
        }
        return;
    }

    // ──────────────────────────────────────────
    // 🎫 BUTTON: إغلاق تذكرة
    // ──────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        const db = loadDB(TICKETS_DB_PATH);
        const ownerId = Object.keys(db).find(uid => db[uid].channelId === interaction.channel.id);

        await interaction.reply({ content: '🔒 هيتم إغلاق التذكرة خلال 5 ثواني...' });

        if (ownerId) {
            db[ownerId].status = 'closed';
            saveDB(TICKETS_DB_PATH, db);
        }

        if (LOG_CHANNEL_ID) {
            try {
                const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
                await logChannel.send({ content: `🔒 تم إغلاق التذكرة <#${interaction.channel.id}> بواسطة <@${interaction.user.id}>` });
            } catch (err) {
                console.error('❌ خطأ في إرسال اللوج:', err);
            }
        }

        setTimeout(async () => {
            try { await interaction.channel.delete(); } catch (e) { }
        }, 5000);
        return;
    }

    // ──────────────────────────────────────────
    // 🪪 BUTTON: بدء المقابلة
    // ──────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'start_interview') {
        const db = loadDB(INTERVIEW_DB_PATH);

        const existing = db[interaction.user.id];
        if (existing && existing.status === 'open') {
            const channelStillExists = interaction.guild.channels.cache.has(existing.channelId)
                || await interaction.guild.channels.fetch(existing.channelId).catch(() => null);

            if (channelStillExists) {
                return interaction.reply({ content: `⚠️ عندك تيكت مقابلة مفتوح بالفعل: <#${existing.channelId}>`, ephemeral: true });
            }
            delete db[interaction.user.id];
            activeInterviews.delete(existing.channelId);
            saveDB(INTERVIEW_DB_PATH, db);
        }

        await interaction.deferReply({ ephemeral: true });

        const ticketChannel = await interaction.guild.channels.create({
            name: `مقابلة-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: INTERVIEW_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: INTERVIEW_ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        db[interaction.user.id] = { channelId: ticketChannel.id, status: 'open', currentQuestion: 0, answers: [] };
        saveDB(INTERVIEW_DB_PATH, db);

        activeInterviews.set(ticketChannel.id, { userId: interaction.user.id, currentQuestion: 0, answers: [] });

        await ticketChannel.send({
            content: `أهلاً <@${interaction.user.id}> 👋\nبدأت مقابلة الـ Whitelist بتاعتك. جاوب على كل سؤال برسالة منفصلة.`,
            embeds: [buildQuestionEmbed(0)]
        });

        await interaction.editReply({ content: `✅ تم فتح تيكت المقابلة: <#${ticketChannel.id}>` });
        return;
    }

    // ──────────────────────────────────────────
    // 🪪 BUTTON: قبول/رفض نتيجة المقابلة
    // ──────────────────────────────────────────
    if (interaction.isButton() && (interaction.customId.startsWith('interview_accept_') || interaction.customId.startsWith('interview_reject_'))) {
        const targetUserId = interaction.customId.split('_')[2];
        const accepted = interaction.customId.startsWith('interview_accept_');
        const db = loadDB(INTERVIEW_DB_PATH);

        const ticketData = db[targetUserId];
        if (!ticketData) {
            return interaction.reply({ content: '❌ بيانات التيكت غير موجودة.', ephemeral: true });
        }

        if (accepted) {
            try {
                const member = await interaction.guild.members.fetch(targetUserId);
                await member.roles.add(CITIZEN_ROLE_ID);
            } catch (err) {
                console.error('❌ خطأ في إعطاء الرول:', err);
            }
        }

        try {
            const member = await interaction.guild.members.fetch(targetUserId);
            await member.send({ embeds: [buildInterviewResultEmbed(accepted)] }).catch(() => {
                interaction.channel.send({ content: `<@${targetUserId}>`, embeds: [buildInterviewResultEmbed(accepted)] });
            });
        } catch (err) {
            console.error('❌ خطأ في إرسال النتيجة:', err);
        }

        const resultText = accepted ? '✅ تم قبول الطلب' : '❌ تم رفض الطلب';
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('interview_accept_done').setLabel('قبول').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId('interview_reject_done').setLabel('رفض').setEmoji('❌').setStyle(ButtonStyle.Danger).setDisabled(true)
        );

        await interaction.update({ components: [disabledRow] });
        await interaction.followUp({ content: `${resultText} بواسطة <@${interaction.user.id}>` });

        if (LOG_CHANNEL_ID) {
            try {
                const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
                const member = await interaction.guild.members.fetch(targetUserId);
                const logEmbed = buildInterviewLogEmbed(member, ticketData.answers || [], accepted, interaction.user.id);
                await logChannel.send({ embeds: [logEmbed] });
            } catch (err) {
                console.error('❌ خطأ في إرسال اللوج:', err);
            }
        }

        ticketData.status = accepted ? 'accepted' : 'rejected';
        saveDB(INTERVIEW_DB_PATH, db);

        setTimeout(async () => {
            try { await interaction.channel.delete(); } catch (e) { }
        }, 10000);
        return;
    }
});

// ============================================================
// ✅ استقبال إجابات المقابلة كرسائل عادية
// ============================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const interview = activeInterviews.get(message.channel.id);
    if (!interview) return;
    if (message.author.id !== interview.userId) return;

    interview.answers.push(message.content);

    const db = loadDB(INTERVIEW_DB_PATH);
    if (db[interview.userId]) {
        db[interview.userId].answers = interview.answers;
        db[interview.userId].currentQuestion = interview.currentQuestion + 1;
    }

    if (interview.currentQuestion + 1 < QUESTIONS.length) {
        interview.currentQuestion++;
        if (db[interview.userId]) db[interview.userId].currentQuestion = interview.currentQuestion;
        saveDB(INTERVIEW_DB_PATH, db);

        await message.channel.send({ embeds: [buildQuestionEmbed(interview.currentQuestion)] });
    } else {
        saveDB(INTERVIEW_DB_PATH, db);

        const member = await message.guild.members.fetch(interview.userId);
        const summaryEmbed = buildSummaryEmbed(member, interview.answers);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`interview_accept_${interview.userId}`).setLabel('قبول').setEmoji('✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`interview_reject_${interview.userId}`).setLabel('رفض').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({
            content: `<@&${INTERVIEW_ADMIN_ROLE_ID}> المقابلة خلصت ✅ راجع الإجابات واتخذ القرار 👇`,
            embeds: [summaryEmbed],
            components: [row]
        });

        activeInterviews.delete(message.channel.id);
    }
});

client.login(TOKEN);
