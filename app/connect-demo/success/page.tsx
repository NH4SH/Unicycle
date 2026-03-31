import { redirect } from "next/navigation";

type ConnectSuccessPageProps = {
  searchParams?: {
    session_id?: string;
  };
};

export default function ConnectSuccessPage({ searchParams }: ConnectSuccessPageProps) {
  const params = new URLSearchParams();
  if (searchParams?.session_id) params.set("session_id", searchParams.session_id);
  const query = params.toString();
  redirect(query ? `/payments/success?${query}` : "/payments/success");
}
