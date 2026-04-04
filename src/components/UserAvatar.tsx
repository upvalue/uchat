interface UserAvatarProps {
  username: string;
  avatarUrl?: string;
}

export function UserAvatar({ username, avatarUrl }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className="h-12 w-12 rounded-md object-cover"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-terminal-green text-lg font-semibold">
      {username[0]?.toUpperCase()}
    </div>
  );
}
