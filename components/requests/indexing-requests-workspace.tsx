"use client";

import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  DatabaseZap,
  ExternalLink,
  FileSearch,
  Link2,
  LoaderCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import {
  submitIndexingRequest,
} from "@/app/(app)/requests/actions";
import type { SubmitIndexingRequestState } from "@/app/(app)/requests/actions";
import type { IndexingRequestItem } from "@/lib/data/indexing-requests";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialRequests: IndexingRequestItem[];
  initialUserId: string | null;
  isAnonymous: boolean;
};

const initialSubmitState: SubmitIndexingRequestState = { outcome: "idle" };

const statusMeta = {
  pending: { label: "Pending approval", icon: Clock3, tone: "text-amber-700 dark:text-amber-300" },
  queued: { label: "Queued", icon: Clock3, tone: "text-muted" },
  running: { label: "Importing", icon: LoaderCircle, tone: "text-accent-text" },
  ready: { label: "Ready", icon: Check, tone: "text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "Rejected", icon: X, tone: "text-red-700 dark:text-red-300" },
  failed: { label: "Failed", icon: CircleAlert, tone: "text-red-700 dark:text-red-300" },
} satisfies Record<IndexingRequestItem["status"], {
  label: string;
  icon: typeof Clock3;
  tone: string;
}>;

function mapRealtimeRow(row: Record<string, unknown>): IndexingRequestItem {
  return {
    id: String(row.id),
    submittedUrl: String(row.submitted_url),
    normalizedUrl: String(row.normalized_url),
    sourceType: row.source_type as IndexingRequestItem["sourceType"],
    status: row.status as IndexingRequestItem["status"],
    destinationPath: typeof row.destination_path === "string" ? row.destination_path : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    progressStage: typeof row.progress_stage === "string" ? row.progress_stage : null,
    progressCompleted: Number(row.progress_completed ?? 0),
    progressTotal: typeof row.progress_total === "number" ? row.progress_total : null,
  };
}

function RequestRow({ request }: { request: IndexingRequestItem }) {
  const meta = statusMeta[request.status];
  const StatusIcon = meta.icon;
  const hostname = new URL(request.normalizedUrl).hostname;
  const isRunning = request.status === "running";

  return (
    <article className="grid gap-4 border-b border-border py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="bg-foreground/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {request.sourceType}
          </span>
          <time className="font-mono text-[10px] text-muted" dateTime={request.createdAt}>
            {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(request.createdAt))}
          </time>
        </div>
        <p className="mt-2 truncate text-sm font-medium text-foreground">{request.normalizedUrl}</p>
        <p className="mt-1 text-xs text-muted">{hostname}</p>
        {isRunning && request.progressStage ? (
          <div className="mt-3 max-w-sm">
            <div className="mb-1.5 flex justify-between gap-3 font-mono text-[10px] text-muted">
              <span>{request.progressStage}</span>
              {request.progressTotal !== null ? (
                <span>{request.progressCompleted}/{request.progressTotal}</span>
              ) : null}
            </div>
            <div className="h-1 overflow-hidden bg-foreground/10">
              <div
                className="h-full bg-accent transition-[width] duration-300"
                style={{
                  width: request.progressTotal
                    ? `${Math.min(100, (request.progressCompleted / request.progressTotal) * 100)}%`
                    : "12%",
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] ${meta.tone}`}>
          <StatusIcon size={14} className={isRunning ? "animate-spin" : undefined} />
          {meta.label}
        </span>
        {request.destinationPath ? (
          <Link
            href={request.destinationPath}
            aria-label="Open indexed hackathon"
            className="grid size-8 place-items-center border border-border text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <ArrowRight size={14} />
          </Link>
        ) : (
          <a
            href={request.normalizedUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open source on Devpost"
            className="grid size-8 place-items-center border border-border text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </article>
  );
}

export function IndexingRequestsWorkspace({
  initialRequests,
  initialUserId,
  isAnonymous,
}: Props) {
  const [state, formAction, pending] = useActionState(
    submitIndexingRequest,
    initialSubmitState,
  );
  const [requests, setRequests] = useState(initialRequests);
  const formRef = useRef<HTMLFormElement>(null);
  const redirectedRequestRef = useRef<string | null>(null);
  const router = useRouter();
  const userId = state.userId ?? initialUserId;
  const displayRequests = useMemo(() => {
    if (state.outcome !== "success" || !state.request) return requests;
    if (requests.some((request) => request.id === state.request!.id)) return requests;
    return [state.request, ...requests];
  }, [requests, state]);

  useEffect(() => {
    if (state.outcome !== "success" || !state.request) return;
    formRef.current?.reset();
  }, [state]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const source = {
      schema: "public",
      table: "indexing_requests",
      filter: `submitted_by=eq.${userId}`,
    } as const;
    const applyRow = (row: Record<string, unknown>) => {
      const changed = mapRealtimeRow(row);
      setRequests((current) => {
        const existingIndex = current.findIndex((item) => item.id === changed.id);
        if (existingIndex === -1) return [changed, ...current];
        return current.map((item) => item.id === changed.id ? changed : item);
      });
    };
    // INSERT matters as well as UPDATE: a request created in another tab, or by
    // any server-side path, is otherwise invisible until a full page reload.
    const channel = supabase
      .channel(`indexing-requests:${userId}`)
      .on(
        "postgres_changes",
        { ...source, event: "INSERT" },
        (payload) => applyRow(payload.new as Record<string, unknown>),
      )
      .on(
        "postgres_changes",
        { ...source, event: "UPDATE" },
        (payload) => applyRow(payload.new as Record<string, unknown>),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    const submittedRequestId = state.outcome === "success" ? state.request?.id : null;
    if (!submittedRequestId || redirectedRequestRef.current === submittedRequestId) return;
    const active = displayRequests.find((request) => request.id === submittedRequestId);
    if (active?.status === "ready" && active.destinationPath) {
      redirectedRequestRef.current = submittedRequestId;
      router.push(active.destinationPath);
    }
  }, [displayRequests, router, state]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-16">
      <section aria-labelledby="index-heading">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-text">
          <span aria-hidden="true" className="size-2 bg-accent" />
          Devpost indexing
        </p>
        <h1 id="index-heading" className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Index Hackathons/Projects
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
          Paste a Devpost link to a hackathon or a specific project. Hackathons are
          indexed after approval; specific projects are indexed immediately.
        </p>

        <form ref={formRef} action={formAction} className="mt-8 border border-border bg-surface p-4 sm:p-5">
          <label htmlFor="devpost-url" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Hackathon or project URL
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 border border-border bg-background px-3 focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-accent/20">
              <Link2 size={15} className="shrink-0 text-muted" />
              <input
                id="devpost-url"
                name="url"
                type="url"
                required
                autoComplete="url"
                placeholder="https://...devpost.com or devpost.com/software/..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-foreground px-5 text-xs font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? <LoaderCircle size={14} className="animate-spin" /> : <DatabaseZap size={14} />}
              {pending ? "Checking URL..." : "Start indexing"}
            </button>
          </div>
          {state.outcome !== "idle" ? (
            <p
              role={state.outcome === "error" ? "alert" : "status"}
              className={`mt-3 text-xs ${state.outcome === "error" ? "text-red-600 dark:text-red-400" : "text-accent-text"}`}
            >
              {state.message}
            </p>
          ) : null}
        </form>

        <div className="mt-5 grid gap-px bg-border sm:grid-cols-2">
          <div className="bg-background p-4">
            <FileSearch size={17} className="text-accent-text" />
            <p className="mt-3 text-sm font-medium">Specific hackathon project</p>
            <p className="mt-1 text-xs leading-5 text-muted">Queues now and opens its parent hackathon page when ready.</p>
          </div>
          <div className="bg-background p-4">
            <Clock3 size={17} className="text-accent-text" />
            <p className="mt-3 text-sm font-medium">Entire hackathon</p>
            <p className="mt-1 text-xs leading-5 text-muted">Indexing every project in a hackathon requires approval because of the compute involved.</p>
          </div>
        </div>

        {isAnonymous ? (
          <p className="mt-6 text-xs leading-5 text-muted">
            Guest allowance: 10 project imports and 5 pending hackathons.{" "}
            <Link href="/signup?next=/requests" className="font-medium text-accent-text hover:underline">
              Create an account for unlimited requests
            </Link>.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="history-heading" className="lg:border-l lg:border-border lg:pl-10">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Live status</p>
            <h2 id="history-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">Your requests</h2>
          </div>
          <span className="font-mono text-[10px] tabular-nums text-muted">{displayRequests.length} total</span>
        </div>
        {displayRequests.length > 0 ? (
          <div>{displayRequests.map((request) => <RequestRow key={request.id} request={request} />)}</div>
        ) : (
          <div className="border-b border-border py-12 text-center">
            <DatabaseZap size={22} className="mx-auto text-muted" />
            <p className="mt-4 text-sm font-medium">No indexing requests yet</p>
            <p className="mt-2 text-xs text-muted">Your submitted URLs and their progress will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
