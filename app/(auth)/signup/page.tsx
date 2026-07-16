import { AuthForm } from "../auth-form";

type SignUpPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error, next } = await searchParams;

  return <AuthForm mode="signup" callbackError={error} nextPath={next} />;
}
