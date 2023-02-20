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
// const talker_role_id = "1077066335466557440";
const talkers = ["280467655541129216", "470935011722395651"];

bot.events.messageCreate = async (b, message) => {
    console.log("new message")
    if (data[message.channelId] === undefined) return;
    console.log("transferrable")
    if (message.guildId == "1077013349625249855") {
        if (!talkers.includes(message.authorId.toString())) return;
        sendMessage(b, data[message.channelId], {content: message.content});
        deleteMessage(b, message.channelId, message.id);
        return;
    }
    const member = await getMember(b, message.guildId, message.authorId);
    const avatar_hash = (member.user.avatar & ~(BigInt(15) << BigInt(32*4))).toString(16).padStart(32, "0");
    const avatar_url = `https://cdn.discordapp.com/avatars/${member.user.id}/${avatar_hash}`
    const body = {
        username: member.nick || member.user.username,
        content: message.content,
        avatar_url: avatar_url,
    }
    if (webhooks[data[message.channelId]] === undefined) return console.log("no webhook :(");
    fetch(webhooks[data[message.channelId]], {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
    })
};

await startBot(bot);
