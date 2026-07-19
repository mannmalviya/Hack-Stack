"use client";

import { CircleUserRound } from "lucide-react";
import { useState } from "react";

type AccountAvatarProps = {
  avatarUrl: string | null;
  displayName: string;
  size?: "lg" | "sm";
};

export function AccountAvatar({
  avatarUrl,
  displayName,
  size = "sm",
}: AccountAvatarProps) {
  const [failed, setFailed] = useState(false);
  const large = size === "lg";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface ${large ? "size-20" : "size-7"}`}
    >
      {avatarUrl && !failed ? (
        // GitHub's avatar CDN serves an already optimized image at these sizes.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`${displayName} profile picture`}
          width={large ? 80 : 28}
          height={large ? 80 : 28}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <CircleUserRound aria-hidden="true" size={large ? 48 : 19} />
      )}
    </span>
  );
}
