import { UvaOnlyGate } from "@/components/sections/uva-only-gate";

type UvaOnlyPageProps = {
  searchParams: {
    email?: string;
  };
};

export default function UvaOnlyPage({ searchParams }: UvaOnlyPageProps) {
  return <UvaOnlyGate prefilledEmail={searchParams.email} />;
}
