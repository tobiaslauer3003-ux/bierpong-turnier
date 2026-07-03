"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { ImageUploadButton } from "@/components/image-upload-button";
import { updateAvatarUrl } from "@/lib/actions/teams";

export function ProfileAvatar({
  userId,
  username,
  avatarColor,
  avatarUrl,
}: {
  userId: string;
  username: string;
  avatarColor: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4">
      <Avatar username={username} color={avatarColor} imageUrl={avatarUrl} size="lg" />
      <div>
        <p className="font-heading text-xl font-bold">{username}</p>
        <ImageUploadButton
          bucket="avatars"
          path={`${userId}/avatar.jpg`}
          label="Profilbild ändern"
          className="mt-2"
          onUploaded={async (url) => {
            await updateAvatarUrl(url);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
