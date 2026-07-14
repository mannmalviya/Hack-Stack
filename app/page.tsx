export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-950">
      <div className="w-full max-w-2xl">
        <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-violet-700 uppercase">
          HackStack
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Evidence for better hackathon judging.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
          Import a hackathon, inspect what each project claims, and verify the
          evidence behind it.
        </p>
      </div>
    </main>
  );
}
