import {
    MessageTypes,
    Embed,
    getMessage,
    getChannelWebhooks,
    executeWebhook,
    getAvatarURL,
    deleteMessage,
    sendMessage,
    getMember,
    createBot,
    Intents,
    startBot,
    Message,
    Bot,
    getUser,
    editBotMember,
    getDmChannel,
    editBotStatus,
} from "https://deno.land/x/discordeno@18.0.0/mod.ts";
import { parse } from "https://deno.land/std@0.97.0/encoding/toml.ts";

import { getProxyChannel, getActualChannel } from "./readdata.ts";

if (Deno.env.get("MRSBILBO_TOKEN") === undefined) throw new Error("Missing MRSBILBO_TOKEN environment variable");

const bot = createBot({
    token: Deno.env.get("MRSBILBO_TOKEN")!,
    intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent | Intents.GuildMembers | Intents.DirectMessages | Intents.GuildWebhooks,
    events: {
        async ready(b: Bot) {
            console.log("Successfully connected to gateway");
            await editBotStatus(b, {status: "offline", activities: []})
        },
    },
});


const config = parse(await Deno.readTextFile("config.toml"));
if (!["talkerRole", "deepGuyId", "mrsBilboId", "homeChannel"].every(key => Object.keys(config).includes(key))) throw new Error("Missing config keys");

bot.events.messageCreate = async (b, message) => {
    if (message.guildId === undefined) {
        await sendProxyDM(b, message);
    } else {
        if (message.guildId === BigInt(<string>config.mrsBilboId)) {
            if (message.content.startsWith("!dm")) {
                await sendDirectMessage(b, message);
            }
            await sendMessageToActualServer(b, message);
        } else {
            await sendProxyMessage(b, message);
        }
    }
};

bot.events.guildMemberUpdate = async (b, member, user) => {
    if (user.id === b.id) {
        if (user.id === b.id && member.nick) {
            await editBotMember(b, member.guildId, {nick: null});
        }
    }
}

async function sendMessageToActualServer(b: Bot, message: Message) {
    const actualChannel = getActualChannel(message.channelId.toString());
    if (actualChannel === undefined) return;
    if (message.webhookId != undefined) return;
    if (!(await getMember(b, message.guildId!, message.authorId)).roles.includes(BigInt(<string>config.talkerRole))) return;
    await deleteMessage(b, message.channelId, message.id);
    await sendMessage(b, actualChannel, {content: message.content});
}

async function sendProxyMessage(b: Bot, message: Message) {
    const proxyChannel = getProxyChannel(message.channelId.toString());
    if (proxyChannel === undefined) return;
    const webhooks = await getChannelWebhooks(b, proxyChannel);
    if (webhooks.size < 1) return;
    const member = await getMember(b, message.guildId!.toString(), message.authorId);
    const webhook = webhooks.first()!;
    const body = {
        username: member.nick ?? member.user?.username,
        content: message.content.replaceAll(`<@${config.deepGuyId}>`, `<@&${config.talkerRole}>`),
        avatarUrl: getAvatarURL(b, member.id, "0000", {avatar: member.user?.avatar}),
        embeds: <Embed[]>message.attachments.map(attachment => ({image: {url: attachment.url}}))
    }
    if (message.type === MessageTypes.Reply) {
        const referencedMessage = await getMessage(b, message.messageReference!.channelId!, message.messageReference!.messageId!);
        const referencedMember = await getMember(b, message.messageReference!.guildId!.toString(), referencedMessage.authorId);
        if (message.mentionedUserIds.includes(BigInt(<string>config.deepGuyId))) {
            body.content = `<@&${config.talkerRole}> ${body.content}`
        }
        body.embeds.push({
            type: "rich",
            title: `Reply to:`,
            description: referencedMessage.content,
            color: 0xFFFF00,
            author: {
                name: referencedMember.nick ?? referencedMember.user!.username,
                iconUrl: getAvatarURL(b, referencedMember.id, referencedMember.user!.discriminator, {avatar: member.user?.avatar})
            }
        });
    }
    executeWebhook(b, webhook.id, webhook.token!, body)
}

async function sendDirectMessage(b: Bot, message: Message) {
    const args = message.content.split(" ");
    if (!(await getMember(b, message.guildId!, message.authorId)).roles.includes(BigInt(<string>config.talkerRole))) return;
    if (args.length < 3) return;
    const dmChannel = await getDmChannel(b, BigInt(args[1]));
    const content = args.slice(2).join(" ");
    sendMessage(b, dmChannel.id, {content});
}

async function sendProxyDM(b: Bot, message: Message) {
    const user = await getUser(b, message.authorId);
    await sendMessage(b, <string>config.homeChannel, {
        embeds: [
            {
                type: "rich",
                description: message.content,
                color: 0x00FFFF,
                author: {
                    name: user.username,
                    iconUrl: getAvatarURL(b, user.id, user.discriminator, {avatar: user.avatar})
                }
            }
        ]
    })
}

await startBot(bot);
