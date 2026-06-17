const avatarModules = import.meta.glob('../assets/avatars/*.{png,webp,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function normalizePlayerKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const avatarByName = new Map<string, string>();
for (const [filePath, imageUrl] of Object.entries(avatarModules)) {
  const match = filePath.match(/\/([^/]+)\.[^.]+$/);
  if (!match) continue;
  avatarByName.set(normalizePlayerKey(match[1]), imageUrl);
}

const avatarAliases: Record<string, string> = {
  d4: 'aco',
};

export function getPlayerAvatar(playerName: string): string | null {
  const normalized = normalizePlayerKey(playerName);
  const aliased = avatarAliases[normalized] ?? normalized;
  return avatarByName.get(aliased) ?? null;
}
