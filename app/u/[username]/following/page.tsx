import { redirect } from "next/navigation";

type FollowingRedirectPageProps = {
  params: {
    username: string;
  };
};

export default function FollowingRedirectPage({ params }: FollowingRedirectPageProps) {
  redirect(`/u/${params.username}/connections?tab=following`);
}
