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
          profileImageUrl: profile.user.profileImageUrl,
          username: profile.user.username,
          usernameConfirmed: profile.user.usernameConfirmed,
          displayName: profile.user.displayName,
          publicUsername: profile.user.publicUsername,
          bio: profile.user.bio,
          gradYear: profile.user.gradYear,
          favoritePickup: profile.user.favoritePickup,
          sellerKind: profile.user.sellerKind,
          verifiedShopName: profile.user.verifiedShopName,
          verifiedShopApprovedAt: profile.user.verifiedShopApprovedAt,
          verifiedShopLocation: profile.user.verifiedShopLocation,
          verifiedShopInstagram: profile.user.verifiedShopInstagram,
          verifiedShopWebsite: profile.user.verifiedShopWebsite
        }}
        social={profile.social}
        stats={profile.stats}
        activeListings={profile.activeListings}
        pastListings={profile.pastListings}
        favorites={profile.favorites}
        recentReviews={profile.recentReviews}
        isOwner={session?.user.id === profile.user.id}
        viewerSignedIn={Boolean(session?.user.id)}
      />
    </div>
  );
}
