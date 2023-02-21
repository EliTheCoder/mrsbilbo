import { deleteMessage, sendMessage, getMember, createBot, Intents, startBot } from "https://deno.land/x/discordeno@18.0.0/mod.ts";

const bot = createBot({
    token: "NTAzNjExNDkzODA0Mjc3Nzgw.GfAIvC.5OJwwWISATKDTzOzGzNKtT91bMghbyycAoL5eY",
    intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent | Intents.GuildMembers,
    events: {
        ready() {
            console.log("Successfully connected to gateway");
        },
    },
});

const data = JSON.parse(await Deno.readTextFile("./data.json"))
const webhooks = JSON.parse(await Deno.readTextFile("./webhooks.json"))

const talkers = ["280467655541129216", "470935011722395651"];

bot.events.messageCreate = async (b, message) => {
    const twin = data[message.channelId.toString()];
    if (twin === undefined) return;
    if (message.guildId?.toString() == "1077013349625249855") {
        if (!talkers.includes(message.authorId.toString())) return;
        await deleteMessage(b, message.channelId, message.id);
        await sendMessage(b, twin, {content: message.content});
        return;
    }
    if (message.guildId === undefined) return;
    const member = await getMember(b, message.guildId.toString(), message.authorId);
    const webhook = webhooks[twin];
    if (webhook === undefined) return;
    fetch(webhook, {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: member.nick || member.user?.username,
            content: message.content.replaceAll("<@503611493804277780>", "<@280467655541129216>"),
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
    const avatar_url = `https://cdn.discordapp.com/avatars/${id}/${avatar_hash}`
    return avatar_url;
}

await startBot(bot);