"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  GalleryVertical,
  Layers,
  RotateCcw,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SetProjectStarResult } from "@/app/(workspace)/hackathons/[slug]/[projects]/actions";
import { hasModifier, isEditableTarget } from "@/lib/keyboard";
import { DUR, EASE_OUT } from "@/components/motion/tokens";
import { ShuffleButton } from "@/components/discover/shuffle-button";
import { SourceLink } from "@/components/projects/source-link";
import { StarButton } from "@/components/projects/star-button";
import type { ProjectReelItem } from "@/lib/data/project-reels";

type SetStar = (input: {
  projectId: string;
  starred: boolean;
}) => Promise<SetProjectStarResult>;

type ReelsMode = "scroll" | "swipe";

const STEP_BUTTON =
  "inline-flex size-8 items-center justify-center text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted";

/** How far (px) or how fast (px/s) a drag must go to count as a swipe. */
const SWIPE_OFFSET = 120;
const SWIPE_VELOCITY = 600;

type CardProps = {
  item: ProjectReelItem;
  /** Where a guest returns after signing in — the feed's own route. */
  signInNext: string;
  /** Cross-hackathon feeds caption each card with the event it came from. */
  showHackathon: boolean;
  signedIn: boolean;
  onSetStar: SetStar;
  /** Inactive cards keep their frame but drop the iframe, stopping playback. */
  active: boolean;
};

function ReelCard({
  item,
  signInNext,
  showHackathon,
  signedIn,
  onSetStar,
  active,
}: CardProps) {
  return (
    <article
      // Links and buttons live inside a draggable card in swipe mode. Keep
      // their pointer gestures from also starting a card drag.
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("a, button")) {
          event.stopPropagation();
        }
      }}
      className="border border-border bg-surface p-3 shadow-lg"
    >
      <div className="relative aspect-video w-full bg-foreground/[0.03]">
        {active ? (
          <iframe
            src={item.videoUrl}
            title={`${item.name} demo video`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full"
          />
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {showHackathon ? (
            <Link
              href={`/hackathons/${item.hackathonSlug}?view=projects`}
              className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
            >
              {item.hackathonName}
            </Link>
          ) : null}
          <Link
            href={`/hackathons/${item.hackathonSlug}/${item.slug}`}
            className="block min-w-0 hover:underline"
          >
            <h2 className="truncate text-lg font-semibold tracking-[-0.03em]">
              {item.name}
            </h2>
          </Link>
          {item.isWinner ? (
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-accent-text">
              <Trophy size={11} aria-hidden="true" />
              Winner
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SourceLink source="devpost" href={item.devpostUrl} />
          {item.githubUrl ? <SourceLink source="github" href={item.githubUrl} /> : null}
          <StarButton
            projectId={item.id}
            initialStarred={item.starred}
            initialStarCount={item.starCount}
            signInHref={signedIn ? null : `/login?next=${encodeURIComponent(signInNext)}`}
            onSetStar={onSetStar}
          />
        </div>
      </div>
    </article>
  );
}

type FeedProps = {
  items: ProjectReelItem[];
  index: number;
  onIndexChange: (index: number) => void;
  signInNext: string;
  showHackathon: boolean;
  signedIn: boolean;
  onSetStar: SetStar;
};

function ScrollFeed({
  items,
  index,
  onIndexChange,
  signInNext,
  showHackathon,
  signedIn,
  onSetStar,
}: FeedProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Captured once so switching from swipe mode restores the position without
  // this effect re-firing on every scroll-driven index change.
  const initialIndex = useRef(index);

  useEffect(() => {
    const container = containerRef.current;
    if (container && initialIndex.current > 0) {
      container.scrollTop = initialIndex.current * container.clientHeight;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const value = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isInteger(value)) onIndexChange(value);
        }
      },
      { root: container, threshold: 0.6 },
    );
    for (const slide of slideRefs.current) {
      if (slide) observer.observe(slide);
    }
    return () => observer.disconnect();
  }, [items.length, onIndexChange]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const container = containerRef.current;
      if (!container) return;
      const height = container.clientHeight;
      const target = Math.min(
        Math.max(Math.round(container.scrollTop / height) + direction, 0),
        items.length - 1,
      );
      if (reduceMotion) {
        container.scrollTo({ top: target * height });
        return;
      }
      // Chromium silently drops smooth scrollIntoView/scrollTo inside mandatory
      // snap containers, so drive the scroll by hand instead.
      animate(container.scrollTop, target * height, {
        duration: DUR.fast * 1.5,
        ease: EASE_OUT,
        onUpdate: (value) => {
          container.scrollTop = value;
        },
      });
    },
    [items.length, reduceMotion],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || hasModifier(event)) return;
      if (isEditableTarget(event.target)) return;
      const direction =
        event.key === "ArrowDown" || event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp" || event.key === "ArrowLeft"
            ? -1
            : null;
      if (!direction) return;
      // Native arrow scrolling would bypass the snap-aware stepper.
      event.preventDefault();
      step(direction);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [step]);

  return (
    <div className="relative min-h-0 flex-1">
      {/* Absolutely positioned: as a percentage-height flex child, this scroll
          container leaked its full content height into the document's scrollable
          overflow (Chromium), letting the body scroll the header away. */}
      <div ref={containerRef} className="absolute inset-0 snap-y snap-mandatory overflow-y-auto">
        {items.map((item, slideIndex) => (
          <div
            key={item.id}
            data-index={slideIndex}
            ref={(el) => {
              slideRefs.current[slideIndex] = el;
            }}
            className="flex h-full snap-start items-center justify-center px-4 py-6"
          >
            <div className="w-full max-w-3xl">
              <ReelCard
                item={item}
                signInNext={signInNext}
                showHackathon={showHackathon}
                signedIn={signedIn}
                onSetStar={onSetStar}
                // Only the selected iframe may stay mounted. Keeping adjacent
                // embeds warm lets their audio continue after scrolling away.
                active={slideIndex === index}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Wheel and touch input over the embed goes to the video's document, not
          this feed, so the feed carries its own step controls. */}
      <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col border border-border bg-surface p-1 shadow-lg">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={index === 0}
          aria-label="Previous video"
          className={STEP_BUTTON}
        >
          <ChevronUp size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={index >= items.length - 1}
          aria-label="Next video"
          className={STEP_BUTTON}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        Scroll or use arrow keys
      </p>
    </div>
  );
}

type DeckCardProps = CardProps & {
  /** The top card is interactive; the behind card previews what's next. */
  role: "top" | "behind";
  canGoPrev: boolean;
  onNavigate: (direction: 1 | -1) => void;
};

/**
 * One card in the swipe deck. Cards keep their identity (key) when they change
 * role, so the behind card promotes to the top in place instead of remounting.
 * Every card is absolutely positioned over the deck's sizer, so entering and
 * exiting cards never disturb layout (and can't end up stacked below).
 */
function DeckCard({ role, canGoPrev, onNavigate, ...card }: DeckCardProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 320], [-10, 10]);
  // Left drag advances, right drag goes back.
  const nextHintOpacity = useTransform(x, [-SWIPE_OFFSET, -48], [1, 0]);
  const prevHintOpacity = useTransform(x, [48, SWIPE_OFFSET], [0, 1]);
  // A drag that ends on a link or button still fires its click; this ref lets
  // the capture handler swallow those so a swipe never doubles as navigation.
  const draggingRef = useRef(false);
  const isTop = role === "top";
  const settle = { duration: reduceMotion ? 0 : DUR.fast, ease: EASE_OUT };

  return (
    <motion.div
      variants={{
        top: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 },
        behind: { x: 0, y: 12, scale: 0.96, rotate: 0, opacity: 0.5 },
        // A card entering on prev returns from where it flew out (the left).
        flyIn: { x: -560, rotate: -12, opacity: 0 },
        hiddenBehind: { y: 12, scale: 0.96, opacity: 0 },
        // Exiting cards go inert immediately, or a quick second swipe grabs
        // the dying card and freezes it mid-flight.
        exitTop: { x: -560, rotate: -12, opacity: 0, zIndex: 3, pointerEvents: "none" },
        exitBehind: { opacity: 0, pointerEvents: "none" },
      }}
      initial={isTop ? "flyIn" : "hiddenBehind"}
      animate={role}
      exit={isTop ? "exitTop" : "exitBehind"}
      transition={settle}
      style={{ zIndex: isTop ? 2 : 1 }}
      // Pinned to the top edge rather than stretched, so a card whose footer
      // runs shorter than the sizer's still lines up with the deck.
      className="absolute inset-x-0 top-0"
    >
      <motion.div
        // Horizontal only: free-axis dragging let a vertical component drift
        // the card out of its slot, and nothing ever reset that offset.
        drag={isTop && !reduceMotion ? "x" : false}
        style={{ x, rotate }}
        onDragStart={() => {
          draggingRef.current = true;
        }}
        onDragEnd={(_, info) => {
          requestAnimationFrame(() => {
            draggingRef.current = false;
          });
          const shouldSwipe =
            Math.abs(info.offset.x) > SWIPE_OFFSET ||
            Math.abs(info.velocity.x) > SWIPE_VELOCITY;
          const direction: 1 | -1 =
            (info.offset.x || info.velocity.x) <= 0 ? 1 : -1;
          if (shouldSwipe && (direction === 1 || canGoPrev)) {
            onNavigate(direction);
            // Advancing hands this card's motion over to the fly-out exit.
            if (direction === 1) return;
          }
          animate(x, 0, settle);
        }}
        onClickCapture={(event) => {
          if (!draggingRef.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        className={isTop ? "relative cursor-grab active:cursor-grabbing" : "relative"}
      >
        <ReelCard {...card} />
        {isTop ? (
          <>
            <motion.span
              aria-hidden="true"
              style={{ opacity: nextHintOpacity }}
              className="pointer-events-none absolute left-4 top-4 -rotate-12 border-2 border-green-500 bg-surface/85 px-2.5 py-1 font-mono text-sm font-bold uppercase tracking-[0.2em] text-green-500"
            >
              Next
            </motion.span>
            {canGoPrev ? (
              <motion.span
                aria-hidden="true"
                style={{ opacity: prevHintOpacity }}
                className="pointer-events-none absolute right-4 top-4 rotate-12 border-2 border-red-500 bg-surface/85 px-2.5 py-1 font-mono text-sm font-bold uppercase tracking-[0.2em] text-red-500"
              >
                Prev
              </motion.span>
            ) : null}
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function SwipeDeck({
  items,
  index,
  onIndexChange,
  signInNext,
  showHackathon,
  signedIn,
  onSetStar,
}: FeedProps) {
  const current = items[index];
  const upNext = items[index + 1];

  const navigate = useCallback(
    (direction: 1 | -1) => {
      const target = index + direction;
      if (target < 0 || target > items.length) return;
      onIndexChange(target);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || hasModifier(event)) return;
      if (isEditableTarget(event.target)) return;
      const direction =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? -1
            : null;
      if (!direction) return;
      event.preventDefault();
      navigate(direction);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
      <div className="relative w-full max-w-3xl">
        {/* Invisible in-flow copy of the current card that gives the deck its
            height; the animated cards all overlay it absolutely. */}
        {current ? (
          <div aria-hidden="true" className="invisible">
            <ReelCard
              item={current}
              signInNext={signInNext}
              showHackathon={showHackathon}
              signedIn={signedIn}
              onSetStar={onSetStar}
              active={false}
            />
          </div>
        ) : null}
        <AnimatePresence initial={false}>
          {upNext ? (
            <DeckCard
              key={upNext.id}
              role="behind"
              item={upNext}
              signInNext={signInNext}
              showHackathon={showHackathon}
              signedIn={signedIn}
              onSetStar={onSetStar}
              active={false}
              canGoPrev={false}
              onNavigate={navigate}
            />
          ) : null}
          {current ? (
            <DeckCard
              key={current.id}
              role="top"
              item={current}
              signInNext={signInNext}
              showHackathon={showHackathon}
              signedIn={signedIn}
              onSetStar={onSetStar}
              active
              canGoPrev={index > 0}
              onNavigate={navigate}
            />
          ) : (
            <motion.div
              key="deck-end"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.fast, ease: EASE_OUT }}
              className="relative flex flex-col items-center gap-5 border border-dashed border-border px-6 py-16 text-center"
            >
              <p className="text-sm font-medium">
                That&apos;s every demo video in this hackathon.
              </p>
              <button
                type="button"
                onClick={() => onIndexChange(0)}
                className="inline-flex items-center gap-2 border border-border bg-surface px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted shadow-lg transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Start over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {current ? (
        <>
          <div className="flex items-center gap-1 border border-border bg-surface p-1 shadow-lg">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={index === 0}
              aria-label="Previous project"
              className={STEP_BUTTON}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label="Next project"
              className={STEP_BUTTON}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Swipe left for next · swipe right for previous · arrow keys work too
          </p>
        </>
      ) : null}
    </div>
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
        active ? "bg-accent text-white" : "text-muted hover:text-foreground"
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </button>
  );
}

export type ProjectReelsProps = {
  /** Heading for the feed, e.g. a hackathon name or "Discover". */
  title: string;
  backHref: string;
  backLabel: string;
  /** This feed's own route, so a guest returns here after signing in. */
  signInNext: string;
  items: ProjectReelItem[];
  signedIn: boolean;
  onSetStar: SetStar;
  /** Caption each card with its hackathon — for feeds that mix events. */
  showHackathon?: boolean;
  /** Adds the shuffle control — only meaningful for a randomised feed. */
  showShuffle?: boolean;
  emptyNote: string;
};

/** Full-screen feed of project demo videos, browsed by scrolling or swiping. */
export function ProjectReels({
  title,
  backHref,
  backLabel,
  signInNext,
  items,
  signedIn,
  onSetStar,
  showHackathon = false,
  showShuffle = false,
  emptyNote,
}: ProjectReelsProps) {
  const [mode, setMode] = useState<ReelsMode>("scroll");
  // Shared between modes so switching keeps your place in the feed.
  const [index, setIndex] = useState(0);
  // Star edits survive mode switches: cards remount from this overlay rather
  // than the server snapshot, which predates any toggles made on this page.
  const [starOverrides, setStarOverrides] = useState<
    Record<string, { starred: boolean; starCount: number }>
  >({});

  const mergedItems = items.map((item) => {
    const override = starOverrides[item.id];
    return override ? { ...item, ...override } : item;
  });

  const setStarTracked: SetStar = useCallback(
    async (input) => {
      const result = await onSetStar(input);
      if (result.outcome === "success") {
        setStarOverrides((current) => {
          const base = items.find((item) => item.id === input.projectId);
          if (!base) return current;
          const previous = current[input.projectId] ?? {
            starred: base.starred,
            starCount: base.starCount,
          };
          const delta =
            input.starred === previous.starred ? 0 : input.starred ? 1 : -1;
          return {
            ...current,
            [input.projectId]: {
              starred: input.starred,
              starCount: previous.starCount + delta,
            },
          };
        });
      }
      return result;
    },
    [items, onSetStar],
  );

  const feedProps: FeedProps = {
    items: mergedItems,
    index,
    onIndexChange: setIndex,
    signInNext,
    showHackathon,
    signedIn,
    onSetStar: setStarTracked,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            {backLabel}
          </Link>
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <h1 className="flex min-w-0 items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.12em] text-foreground">
            <Clapperboard size={16} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{title}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 ? (
            // The position is the one number worth reading at a glance, so the
            // current index carries the weight and the total stays secondary.
            <p className="flex items-baseline gap-1 font-mono tabular-nums">
              <span className="sr-only">
                Project {Math.min(index + 1, items.length)} of {items.length}
              </span>
              <span
                aria-hidden="true"
                className="text-xl font-bold leading-none tracking-[-0.02em] text-foreground"
              >
                {Math.min(index + 1, items.length)}
              </span>
              <span aria-hidden="true" className="text-sm leading-none text-muted">
                / {items.length}
              </span>
            </p>
          ) : null}
          {showShuffle ? <ShuffleButton /> : null}
          <div className="flex gap-1 border border-border bg-surface p-1">
            <ModeButton
              icon={GalleryVertical}
              label="Scroll"
              active={mode === "scroll"}
              onClick={() => setMode("scroll")}
            />
            <ModeButton
              icon={Layers}
              label="Swipe"
              active={mode === "swipe"}
              onClick={() => setMode("swipe")}
            />
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="border border-dashed border-border px-6 py-16 text-center text-xs text-muted">
            {emptyNote}
          </p>
        </div>
      ) : mode === "scroll" ? (
        <ScrollFeed {...feedProps} />
      ) : (
        <SwipeDeck {...feedProps} />
      )}
    </div>
  );
}
