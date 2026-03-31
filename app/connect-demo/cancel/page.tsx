import { redirect } from "next/navigation";

type ConnectCancelPageProps = {
  searchParams?: {
    productId?: string;
  };
};

export default function ConnectCancelPage({ searchParams }: ConnectCancelPageProps) {
  const params = new URLSearchParams();
  if (searchParams?.productId) params.set("productId", searchParams.productId);
  const query = params.toString();
  redirect(query ? `/payments/cancel?${query}` : "/payments/cancel");
}
