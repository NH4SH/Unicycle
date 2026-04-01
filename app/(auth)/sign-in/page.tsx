import { SignInForm } from "@/components/sections/sign-in-form";
import { isDevAuthBypassEnabled } from "@/lib/auth";

type SignInPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <SignInForm
      callbackUrl={searchParams?.callbackUrl || "/market"}
      enableDevBypass={isDevAuthBypassEnabled()}
    />
  );
}
