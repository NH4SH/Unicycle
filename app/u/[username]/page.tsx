import { notFound } from "next/navigation";

import { ProfileView } from "@/components/profile/profile-view";
import { getAuthSession } from "@/lib/auth";
import { getUserProfile } from "@/lib/data";

type UserProfilePageProps = {
  params: {
    username: string;
  };
};

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const session = await getAuthSession();
  const profile = await getUserProfile(params.username, session?.user.id);

  if (!profile) {
    notFound();
  }

  return (
    <div className="container py-8">
      <ProfileView
        user={{
          id: profile.user.id,
          name: profile.user.name,
          image: profile.user.image,
          username: profile.user.username,
          bio: profile.user.bio,
          gradYear: profile.user.gradYear,
          favoritePickup: profile.user.favoritePickup,
          instagram: profile.user.instagram
        }}
        stats={profile.stats}
        activeListings={profile.activeListings}
        soldListings={profile.soldListings}
        favorites={profile.favorites}
        isOwner={session?.user.id === profile.user.id}
      />
    </div>
  );
}
