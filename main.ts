import { getChannelWebhooks, executeWebhook, getAvatarURL, deleteMessage, sendMessage, getMember, createBot, Intents, startBot, Message, Bot, getUser } from "https://deno.land/x/discordeno@18.0.0/mod.ts";
import { parse } from "https://deno.land/std@0.97.0/encoding/toml.ts";

import { getActualChannel } from "./readdata.ts";

if (Deno.env.get("MRSBILBO_TOKEN") === undefined) throw new Error("Missing MRSBILBO_TOKEN environment variable");

const bot = createBot({
    token: Deno.env.get("MRSBILBO_TOKEN")!,
    intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent | Intents.GuildMembers | Intents.DirectMessages | Intents.GuildWebhooks,
    events: {
        ready() {
            console.log("Successfully connected to gateway");
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
            await sendMessageToActualServer(b, message);
        } else {
            await sendProxyMessage(b, message);
        }
    }
};

async function sendMessageToActualServer(b: Bot, message: Message) {
    const actualChannel = getActualChannel(message.channelId.toString());
    if (actualChannel === undefined) return;
    if (message.webhookId != undefined) return;
    if (!(await getMember(b, message.guildId!, message.authorId)).roles.includes(BigInt(<string>config.talkerRole))) return;
    await deleteMessage(b, message.channelId, message.id);
    await sendMessage(b, actualChannel, {content: message.content});
}

async function sendProxyMessage(b: Bot, message: Message) {
    const actualChannel = getActualChannel(message.channelId.toString());
    if (actualChannel === undefined) return;
    const webhooks = await getChannelWebhooks(b, actualChannel);
    if (webhooks.size < 1) return;
    const member = await getMember(b, message.guildId!.toString(), message.authorId);
    const webhook = webhooks.first()!;
    executeWebhook(b, webhook.id, webhook.token!, {
        username: member.nick ?? member.user?.username,
        content: message.content.replaceAll(`<@${config.deepGuyId}>`, `<@&${config.talkerRole}>`),
        avatarUrl: getAvatarURL(b, member.id, "0000", {avatar: member.user?.avatar}),
        embeds: message.attachments.map(attachment => {
            return {image: {url: attachment.url}};
        })
    })
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
