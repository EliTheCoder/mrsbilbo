const data = (await Deno.readTextFile("./data.ssv"))
    .split("\n")
    .filter(line => !line.startsWith("//"))
    .map(line => line.split(" "))
    .filter(line => line.length === 3);

export function getActualChannel(id: string) {
    const index = data.findIndex(element => element[0] === id);
    return index === -1 ? undefined : data[index][1];
}

export function getWebhook(id: string) {
    const index = data.findIndex(element => element[1] === id);
    return index === -1 ? undefined : data[index][2];
}

