// ================================================
// 📋 B3R RP — Logs Bot + Arabic Ticket System
//    Discord Coding Store | Claude Powered
// ================================================

const {
    Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder,
    REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, PermissionFlagsBits, ChannelType, AuditLogEvent
} = require('discord.js');
const fs = require('fs');

// ============================================================
// ✅ الإعدادات — Environment Variables (Railway)
// ============================================================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// --- روم كل نوع لوج (حط الـ ID بتاع كل روم في المتغير بتاعه) ---
const LOG_CHANNELS = {
    changeNickname:      process.env.LOG_CHANGE_NICKNAME_CHANNEL,
    editMessage:         process.env.LOG_EDIT_MESSAGE_CHANNEL, // بيغطي edit-message و message-edited مع بعض
    ban:                 process.env.LOG_BAN_CHANNEL,
    unban:               process.env.LOG_UNBAN_CHANNEL,
    voiceSwitched:       process.env.LOG_VOICE_SWITCHED_CHANNEL,
    deleteChannel:       process.env.LOG_DELETE_CHANNEL_CHANNEL,
    kick:                process.env.LOG_KICK_CHANNEL,
    timeout:             process.env.LOG_TIMEOUT_CHANNEL,
    voiceMove:           process.env.LOG_VOICE_MOVE_CHANNEL,
    giveRole:            process.env.LOG_GIVE_ROLE_CHANNEL,
    joinVoice:           process.env.LOG_JOIN_VOICE_CHANNEL,
    removeRole:          process.env.LOG_REMOVE_ROLE_CHANNEL,
    disconnectVoice:     process.env.LOG_DISCONNECT_VOICE_CHANNEL,
    editChannel:         process.env.LOG_EDIT_CHANNEL_CHANNEL,
    deleteMessage:       process.env.LOG_DELETE_MESSAGE_CHANNEL,
    channelPermissions:  process.env.LOG_CHANNEL_PERMISSIONS_CHANNEL,
    createChannel:       process.env.LOG_CREATE_CHANNEL_CHANNEL,
    voiceStatus:         process.env.LOG_VOICE_STATUS_CHANNEL,
    voiceLeft:           process.env.LOG_VOICE_LEFT_CHANNEL,
    roleDeleted:         process.env.LOG_ROLE_DELETED_CHANNEL,
    security:            process.env.LOG_SECURITY_CHANNEL,
};

// --- نظام التذاكر ---
const TICKETS_CATEGORY_ID = process.env.TICKETS_CATEGORY_ID;
const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID;
const TICKETS_PANEL_CHANNEL_ID = process.env.TICKETS_PANEL_CHANNEL_ID; // اختياري، للأمر /tickets-setup مش لازم

const TICKETS_DB_PATH = './tickets.json';
function loadDB() {
    if (!fs.existsSync(TICKETS_DB_PATH)) fs.writeFileSync(TICKETS_DB_PATH, '{}');
    return JSON.parse(fs.readFileSync(TICKETS_DB_PATH, 'utf8'));
}
function saveDB(data) {
    fs.writeFileSync(TICKETS_DB_PATH, JSON.stringify(data, null, 2));
}

// ============================================================
// ✅ أنواع التذاكر — عربي بالكامل (مبني على نفس فكرة Top Fight System)
// ============================================================
const TICKET_TYPES = [
    { id: 'store', label: 'المتجر', emoji: '🛒', description: 'طلب منتج أو خدمة من المتجر' },
    { id: 'report', label: 'شكوى على لاعب', emoji: '🚫', description: 'شكوى على لاعب أو تصرف مخالف' },
    { id: 'support', label: 'الدعم الفني', emoji: '🛠️', description: 'طلب الدعم الفني أو الاستفسار العام' },
    { id: 'anticheat', label: 'اعتراض حظر أنتي تشيت', emoji: '🚗', description: 'اعتراض أو استفسار على حظر بلاك ليست شيت' },
    { id: 'compensation', label: 'تعويضات', emoji: '💵', description: 'استرجاع العناصر المفقودة' },
    { id: 'bugs', label: 'إبلاغ عن مشكلة', emoji: '🐛', description: 'الإبلاغ عن مشكلة أو خلل' },
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

const commands = [
    new SlashCommandBuilder()
        .setName('tickets-setup')
        .setDescription('إنشاء رسالة نظام التذاكر (للأدمن فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

// ============================================================
// ✅ دالة موحدة لإرسال أي لوج
// ============================================================
async function sendLog(type, embed) {
    const channelId = LOG_CHANNELS[type];
    if (!channelId) return; // متغير الروم ده مش متظبط، تجاهل
    try {
        const channel = await client.channels.fetch(channelId);
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error(`❌ خطأ في إرسال لوج (${type}):`, err.message);
    }
}

function baseEmbed(color, title) {
    return new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
}

// ============================================================
// ✅ لوجز الأودت لوج (بان، كيك، تايم أوت، رولات، تشانلز)
// ============================================================
client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    const executor = entry.executor ? `<@${entry.executor.id}>` : 'غير معروف';

    switch (entry.action) {
        case AuditLogEvent.MemberBanAdd: {
            const embed = baseEmbed('#e74c3c', '🔨 حظر عضو (Ban)')
                .setDescription(`**العضو:** <@${entry.targetId}>\n**بواسطة:** ${executor}\n**السبب:** ${entry.reason || 'بدون سبب'}`);
            await sendLog('ban', embed);
            break;
        }
        case AuditLogEvent.MemberBanRemove: {
            const embed = baseEmbed('#2ecc71', '✅ فك حظر عضو (Unban)')
                .setDescription(`**العضو:** <@${entry.targetId}>\n**بواسطة:** ${executor}`);
            await sendLog('unban', embed);
            break;
        }
        case AuditLogEvent.MemberKick: {
            const embed = baseEmbed('#e67e22', '👢 طرد عضو (Kick)')
                .setDescription(`**العضو:** <@${entry.targetId}>\n**بواسطة:** ${executor}\n**السبب:** ${entry.reason || 'بدون سبب'}`);
            await sendLog('kick', embed);
            break;
        }
        case AuditLogEvent.MemberUpdate: {
            for (const change of entry.changes || []) {
                if (change.key === 'communication_disabled_until') {
                    const embed = baseEmbed('#f1c40f', '⏱️ تايم أوت (Timeout)')
                        .setDescription(`**العضو:** <@${entry.targetId}>\n**بواسطة:** ${executor}\n**حتى:** ${change.new ? `<t:${Math.floor(new Date(change.new).getTime()/1000)}:F>` : 'تم الإلغاء'}`);
                    await sendLog('timeout', embed);
                }
                if (change.key === 'nick') {
                    const embed = baseEmbed('#3498db', '✏️ تغيير نيك نيم')
                        .setDescription(`**العضو:** <@${entry.targetId}>\n**بواسطة:** ${executor}\n**من:** ${change.old || 'بدون'}\n**إلى:** ${change.new || 'بدون'}`);
                    await sendLog('changeNickname', embed);
                }
            }
            break;
        }
        case AuditLogEvent.MemberRoleUpdate: {
            for (const change of entry.changes || []) {
                if (change.key === '$add') {
                    for (const role of change.new || []) {
                        const embed = baseEmbed('#2ecc71', '➕ إضافة رول')
                            .setDescription(`**العضو:** <@${entry.targetId}>\n**الرول:** <@&${role.id}>\n**بواسطة:** ${executor}`);
                        await sendLog('giveRole', embed);
                    }
                }
                if (change.key === '$remove') {
                    for (const role of change.new || []) {
                        const embed = baseEmbed('#e74c3c', '➖ إزالة رول')
                            .setDescription(`**العضو:** <@${entry.targetId}>\n**الرول:** <@&${role.id}>\n**بواسطة:** ${executor}`);
                        await sendLog('removeRole', embed);
                    }
                }
            }
            break;
        }
        case AuditLogEvent.RoleDelete: {
            const embed = baseEmbed('#e74c3c', '🗑️ حذف رول')
                .setDescription(`**الرول:** ${entry.target?.name || 'غير معروف'}\n**بواسطة:** ${executor}`);
            await sendLog('roleDeleted', embed);
            break;
        }
        case AuditLogEvent.ChannelCreate: {
            const embed = baseEmbed('#2ecc71', '📁 إنشاء روم')
                .setDescription(`**الروم:** ${entry.target?.name || 'غير معروف'}\n**بواسطة:** ${executor}`);
            await sendLog('createChannel', embed);
            break;
        }
        case AuditLogEvent.ChannelDelete: {
            const embed = baseEmbed('#e74c3c', '🗑️ حذف روم')
                .setDescription(`**الروم:** ${entry.target?.name || 'غير معروف'}\n**بواسطة:** ${executor}`);
            await sendLog('deleteChannel', embed);
            break;
        }
        case AuditLogEvent.ChannelUpdate: {
            const embed = baseEmbed('#3498db', '✏️ تعديل روم')
                .setDescription(`**الروم:** <#${entry.targetId}>\n**بواسطة:** ${executor}`);
            await sendLog('editChannel', embed);
            break;
        }
        case AuditLogEvent.ChannelOverwriteCreate:
        case AuditLogEvent.ChannelOverwriteUpdate:
        case AuditLogEvent.ChannelOverwriteDelete: {
            const embed = baseEmbed('#9b59b6', '🔐 تعديل صلاحيات روم')
                .setDescription(`**الروم:** <#${entry.targetId}>\n**بواسطة:** ${executor}`);
            await sendLog('channelPermissions', embed);
            break;
        }
    }
});

// ============================================================
// ✅ لوجز الرسائل (تعديل / حذف)
// ============================================================
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const embed = baseEmbed('#3498db', '✏️ تعديل رسالة')
        .setDescription(`**العضو:** ${newMsg.author}\n**الروم:** <#${newMsg.channelId}>`)
        .addFields(
            { name: 'قبل', value: oldMsg.content?.slice(0, 1000) || '—' },
            { name: 'بعد', value: newMsg.content?.slice(0, 1000) || '—' }
        );
    await sendLog('editMessage', embed);
});

client.on('messageDelete', async (msg) => {
    if (msg.author?.bot) return;
    const embed = baseEmbed('#e74c3c', '🗑️ حذف رسالة')
        .setDescription(`**العضو:** ${msg.author || 'غير معروف'}\n**الروم:** <#${msg.channelId}>\n**المحتوى:** ${msg.content?.slice(0, 1000) || '—'}`);
    await sendLog('deleteMessage', embed);
});

// ============================================================
// ✅ لوجز الفويس (دخول / خروج / نقل / تبديل / تغيير الحالة)
// ============================================================
client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member || oldState.member;

    // دخول فويس
    if (!oldState.channelId && newState.channelId) {
        const embed = baseEmbed('#2ecc71', '🎙️ دخول فويس')
            .setDescription(`**العضو:** ${member}\n**الروم:** <#${newState.channelId}>`);
        await sendLog('joinVoice', embed);
        return;
    }

    // خروج كامل من الفويس
    if (oldState.channelId && !newState.channelId) {
        const embed = baseEmbed('#e67e22', '🚪 خروج من الفويس')
            .setDescription(`**العضو:** ${member}\n**الروم:** <#${oldState.channelId}>`);
        await sendLog('voiceLeft', embed);
        return;
    }

    // تبديل روم فويس (نقله حد، أو نقل نفسه)
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const embed = baseEmbed('#3498db', '🔀 تبديل فويس')
            .setDescription(`**العضو:** ${member}\n**من:** <#${oldState.channelId}>\n**إلى:** <#${newState.channelId}>`);
        await sendLog('voiceSwitched', embed);
        return;
    }

    // تغيير حالة الروم الصوتي (Voice Channel Status)
    if (oldState.channel?.status !== newState.channel?.status) {
        const embed = baseEmbed('#9b59b6', '💬 تغيير حالة الفويس')
            .setDescription(`**الروم:** <#${newState.channelId}>\n**الحالة الجديدة:** ${newState.channel?.status || 'بدون'}`);
        await sendLog('voiceStatus', embed);
    }
});

// ملاحظة: "نقل عضو بواسطة أدمن" (Move) و"فصل عضو بواسطة أدمن" (Disconnect) بيتسجلوا
// في الأودت لوج تحت MemberDisconnect / MemberMove — مضافين هنا لو الديسكورد فعّلهم لسيرفرك
client.on('guildAuditLogEntryCreate', async (entry) => {
    if (entry.action === AuditLogEvent.MemberDisconnect) {
        const embed = baseEmbed('#e74c3c', '🔌 فصل عضو من الفويس (بواسطة أدمن)')
            .setDescription(`**بواسطة:** ${entry.executor ? `<@${entry.executor.id}>` : 'غير معروف'}`);
        await sendLog('disconnectVoice', embed);
    }
    if (entry.action === AuditLogEvent.MemberMove) {
        const embed = baseEmbed('#3498db', '➡️ نقل عضو في الفويس (بواسطة أدمن)')
            .setDescription(`**بواسطة:** ${entry.executor ? `<@${entry.executor.id}>` : 'غير معروف'}`);
        await sendLog('voiceMove', embed);
    }
});

// ============================================================
// ✅ نظام التذاكر — عربي بالكامل (قايمة اختيار زي Top Fight System)
// ============================================================
function buildTicketPanelEmbed() {
    return new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle('🎫 نظام التذاكر')
        .setDescription(
            '**قوانين فتح التذكرة**\n\n' +
            '• احترام الجميع: تعامل مع فريق الدعم والأعضاء الآخرين بكل احترام وأدب.\n' +
            '• وضّح التفاصيل الكاملة: عند فتح التذكرة، يرجى وضع كافة وصف واضح للمشكلة أو الطلب لتسهيل عملية المساعدة.\n' +
            '• لا تفتح تذكرة لأمور غير ضرورية أو لتكرار الطلبات.\n' +
            '• الانتظار بصبر: قد يستغرق فريق الدعم بعض الوقت للرد على التذكرة، يرجى التحلي بالصبر.\n' +
            '• عدم الإغلاق دون إذن: إذا تم إغلاقها حتى يتم حل المشكلة أو بموافقة فريق الدعم.\n' +
            '• التواصل فقط داخل التذكرة: جميع المحادثات المتعلقة بالطلب أو المشكلة يجب أن تكون داخل التذكرة فقط.\n' +
            '• عدم مشاركة معلومات حساسة: لا تقم بمشاركة معلومات شخصية أو كلمات مرور في التذكرة.\n' +
            '• فتح التذاكر عند الحاجة فقط: استخدم نظام التذاكر فقط عند الضرورة لترك المجال لطلبات الأعضاء الآخرين.'
        )
        .setFooter({ text: 'B3R RP • All Rights Reserved' });
}

function buildTicketSelectMenu() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('اختر القسم')
            .addOptions(
                TICKET_TYPES.map(t => ({
                    label: t.label,
                    description: t.description,
                    value: t.id,
                    emoji: t.emoji
                }))
            )
    );
}

function buildCloseTicketRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التذكرة').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    );
}

client.on('interactionCreate', async (interaction) => {

    // ─── SLASH: /tickets-setup ──────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'tickets-setup') {
        await interaction.channel.send({ embeds: [buildTicketPanelEmbed()], components: [buildTicketSelectMenu()] });
        await interaction.reply({ content: '✅ تم إنشاء رسالة التذاكر.', ephemeral: true });
        return;
    }

    // ─── SELECT MENU: اختيار نوع التذكرة ──────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const typeId = interaction.values[0];
        const type = TICKET_TYPES.find(t => t.id === typeId);
        if (!type) return;

        const db = loadDB();
        const key = interaction.user.id;

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
                { id: SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        db[key] = { channelId: ticketChannel.id, type: type.id, status: 'open', createdAt: new Date().toISOString() };
        saveDB(db);

        const openEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`${type.emoji} تذكرة: ${type.label}`)
            .setDescription(`أهلاً <@${interaction.user.id}> 👋\n\n${type.description}\n\nاشرح طلبك أو مشكلتك بالتفصيل وانتظر رد فريق الدعم.`)
            .setFooter({ text: 'B3R RP • نظام التذاكر' })
            .setTimestamp();

        await ticketChannel.send({
            content: `<@${interaction.user.id}> | <@&${SUPPORT_ROLE_ID}>`,
            embeds: [openEmbed],
            components: [buildCloseTicketRow()]
        });

        await interaction.editReply({ content: `✅ تم فتح تذكرتك: <#${ticketChannel.id}>` });
        return;
    }

    // ─── BUTTON: إغلاق التذكرة ──────────────────
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        const db = loadDB();
        const ownerId = Object.keys(db).find(uid => db[uid].channelId === interaction.channel.id);

        await interaction.reply({ content: '🔒 هيتم إغلاق التذكرة خلال 5 ثواني...' });

        if (ownerId) {
            db[ownerId].status = 'closed';
            saveDB(db);
        }

        setTimeout(async () => {
            try { await interaction.channel.delete(); } catch (e) { }
        }, 5000);
        return;
    }
});

client.login(TOKEN);
