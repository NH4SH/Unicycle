import { redirect } from "next/navigation";

type ConnectDemoPageProps = {
  searchParams?: {
    accountId?: string;
    refresh?: string;
  };
};

export default function ConnectDemoPage({ searchParams }: ConnectDemoPageProps) {
  const params = new URLSearchParams();
  if (searchParams?.accountId) params.set("accountId", searchParams.accountId);
  if (searchParams?.refresh) params.set("refresh", searchParams.refresh);
  const query = params.toString();
  redirect(query ? `/payments?${query}` : "/payments");
}
