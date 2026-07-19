import { permanentRedirect } from "next/navigation";

type SignUpPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error, next } = await searchParams;
  const loginParams = new URLSearchParams();

  if (error) {
    loginParams.set("error", error);
  }

  if (next) {
    loginParams.set("next", next);
  }

  permanentRedirect(
    `/login${loginParams.size ? `?${loginParams.toString()}` : ""}`,
  );
}
