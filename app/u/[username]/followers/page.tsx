import { redirect } from "next/navigation";

type FollowersRedirectPageProps = {
  params: {
    username: string;
  };
};

export default function FollowersRedirectPage({ params }: FollowersRedirectPageProps) {
  redirect(`/u/${params.username}/connections?tab=followers`);
}
