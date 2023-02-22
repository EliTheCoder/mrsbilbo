import { deleteMessage, sendMessage, getMember, createBot, Intents, startBot } from "https://deno.land/x/discordeno@18.0.0/mod.ts";
import { getActualChannel, getWebhook } from "./readdata.ts";
import { parse } from "https://deno.land/std@0.97.0/encoding/toml.ts";

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
if (!["talkerRole", "deepGuyId", "mrsBilboId"].every(key => Object.keys(config).includes(key))) throw new Error("Missing config keys");

bot.events.messageCreate = async (b, message) => {
    if (message.guildId === undefined) return;
    if (message.guildId === BigInt(<string>config.mrsBilboId)) {
        const actualChannel = getActualChannel(message.channelId.toString());
        if (actualChannel === undefined) return;
        if (message.isFromBot) return;
        if (!(await getMember(b, message.guildId, message.authorId)).roles.includes(BigInt(<string>config.talkerRole))) return;
        await deleteMessage(b, message.channelId, message.id);
        await sendMessage(b, actualChannel, {content: message.content});
        return;
    }
    const member = await getMember(b, message.guildId.toString(), message.authorId);
    const webhook = getWebhook(message.channelId.toString());
    if (webhook === undefined) return;
    fetch(webhook, {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: member.nick ?? member.user?.username,
            content: message.content.replaceAll(`<@${config.deepGuyId}>`, `<@${config.talkerRole}>`),
            avatar_url: getAvatarURL(member.user?.avatar, member.user?.id),
            embeds: message.attachments.map(attachment => {
                return {image: {url: attachment.url}};
            })
        }),
    })
};

function getAvatarURL(avatar: bigint | undefined, id: bigint | undefined) {
    if (avatar === undefined || id === undefined) return undefined;
    const avatar_hash = (avatar & ~(BigInt(15) << BigInt(32*4))).toString(16).padStart(32, "0");
    return `https://cdn.discordapp.com/avatars/${id}/${avatar_hash}`
}

await startBot(bot);
