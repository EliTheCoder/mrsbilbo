import {
    MessageTypes,
    Embed,
    getMessage,
    getChannelWebhooks,
    executeWebhook,
    getAvatarURL,
    getMember,
    createBot,
    Intents,
    startBot,
    Message,
    Bot,
    editBotStatus,
} from "https://deno.land/x/discordeno@18.0.0/mod.ts";
import { parse } from "https://deno.land/std@0.97.0/encoding/toml.ts";

import { getProxyChannel } from "./readdata.ts";

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

bot.events.messageCreate = sendProxyMessage;

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

await startBot(bot);
