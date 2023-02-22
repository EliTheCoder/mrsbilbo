export function getAvatarURL(avatar: bigint | undefined, id: bigint | undefined) {
    if (avatar === undefined || id === undefined) return undefined;
    const avatar_hash = (avatar & ~(BigInt(15) << BigInt(32*4))).toString(16).padStart(32, "0");
    return `https://cdn.discordapp.com/avatars/${id}/${avatar_hash}`
}
