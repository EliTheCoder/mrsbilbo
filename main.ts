import { deleteMessage, sendMessage, getMember, createBot, Intents, startBot, Message, Bot } from "https://deno.land/x/discordeno@18.0.0/mod.ts";
import { parse } from "https://deno.land/std@0.97.0/encoding/toml.ts";

import { getActualChannel, getWebhook } from "./readdata.ts";
import { getAvatarURL } from "./avatarurl.ts"

if (Deno.env.get("MRSBILBO_TOKEN") === undefined) throw new Error("Missing MRSBILBO_TOKEN environment variable");

const bot = createBot({
    token: Deno.env.get("MRSBILBO_TOKEN")!,
    intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent | Intents.GuildMembers,
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
        sendMessage(b, <string>config.homeChannel, {
            content: `**DM from ${message.tag}:** ${message.content}`
        })
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
    const webhook = getWebhook(message.channelId.toString());
    if (webhook === undefined) return;
    const member = await getMember(b, message.guildId!.toString(), message.authorId);
    fetch(webhook, {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: member.nick ?? member.user?.username,
            content: message.content.replaceAll(`<@${config.deepGuyId}>`, `<@&${config.talkerRole}>`),
            avatar_url: getAvatarURL(member.user?.avatar, member.user?.id),
            embeds: message.attachments.map(attachment => {
                return {image: {url: attachment.url}};
            })
        }),
    })
}

await startBot(bot);
