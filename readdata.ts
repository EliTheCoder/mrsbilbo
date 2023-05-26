const data = (await Deno.readTextFile("./data.ssv"))
    .split(/\r?\n/)
    .filter(line => !line.startsWith("//"))
    .map(line => line.split(" "))
    .filter(line => line.length === 2);

export function getProxyChannel(id: string) {
    const index = data.findIndex(element => element[1] === id);
    return index === -1 ? undefined : data[index][0];
}
