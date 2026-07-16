import { AuthForm } from "../auth-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return <AuthForm mode="login" callbackError={error} nextPath={next} />;
}
