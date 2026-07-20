"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import { MotionConfig } from "motion/react";
import { ChevronDown, FolderTree, Package } from "lucide-react";
import { useState } from "react";

import { AnimatedBar } from "@/components/motion/animated-bar";
import { formatBytes, RepoFileDrawer } from "@/components/projects/repo-file-drawer";
import type {
  ArchitectureLayer,
  ArchitectureManifest,
  ProjectArchitecture,
} from "@/lib/architecture/project-architecture";

/**
 * Categorical slots 1–6 of the validated default data-viz palette, stepped per
 * mode. Languages are identities, not magnitudes, so they get distinct hues in
 * a fixed order rather than shades of the accent.
 */
const LANGUAGE_COLORS = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#008300", dark: "#008300" },
  { light: "#e87ba4", dark: "#d55181" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eb6834", dark: "#d95926" },
];

/** Past this the tail is folded into one neutral "Other" segment. */
const LANGUAGE_SLOTS = LANGUAGE_COLORS.length;

/** Packages listed per manifest before the rest collapse into a count. */
const PACKAGES_SHOWN = 18;

const numberFormat = new Intl.NumberFormat("en-US");

type SeriesColor = (typeof LANGUAGE_COLORS)[number] | null;

/** Hands both modes' steps to the `.series-mark` rule in globals.css. */
function seriesStyle(color: SeriesColor): React.CSSProperties | undefined {
  if (!color) return undefined;
  return { "--series": color.light, "--series-dark": color.dark } as React.CSSProperties;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
      {children}
    </h3>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[11px] leading-relaxed text-muted">{children}</p>;
}

function ModuleChip({ path, fileCount, onOpen }: {
  path: string;
  fileCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Browse ${path}`}
      className="flex max-w-full items-center gap-1.5 border border-border px-2 py-1 transition-colors hover:border-accent hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <span className="truncate font-mono text-[11px]">{path}</span>
      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">{fileCount}</span>
    </button>
  );
}

/**
 * One band of the stack diagram. The bands are ordered by where they sit in a
 * request, not by size, so the column reads top-down as a flow.
 */
function LayerBand({ layer, onOpenModule }: {
  layer: ArchitectureLayer;
  onOpenModule: (path: string) => void;
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="flex items-baseline gap-3 border-l-2 border-accent px-4 pt-3">
        <h4 className="font-mono text-[11px] uppercase tracking-[0.14em]">{layer.label}</h4>
        <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-muted">
          {numberFormat.format(layer.fileCount)} {layer.fileCount === 1 ? "file" : "files"}
          {" · "}
          {layer.share.toFixed(0)}%
        </span>
      </div>

      <div className="border-l-2 border-accent px-4 pb-3">
        <p className="mt-1 text-xs leading-relaxed text-muted">{layer.description}</p>

        <div
          className="mt-3 h-1 bg-foreground/[0.06]"
          role="img"
          aria-label={`${layer.label}: ${layer.share.toFixed(0)}% of indexed files`}
        >
          <AnimatedBar percent={Math.max(layer.share, 1)} className="bg-accent" />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {layer.modules.map((module) => (
            <ModuleChip
              key={module.path}
              path={module.path}
              fileCount={module.fileCount}
              onOpen={() => onOpenModule(module.path)}
            />
          ))}
          {layer.hiddenModuleCount > 0 ? (
            <span className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              +{layer.hiddenModuleCount} more
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LayerStack({ layers, onOpenModule }: {
  layers: ArchitectureLayer[];
  onOpenModule: (path: string) => void;
}) {
  const runtime = layers.filter((layer) => layer.runtime);
  const supporting = layers.filter((layer) => !layer.runtime);

  return (
    <div className="space-y-6">
      {runtime.length > 0 ? (
        <ol className="space-y-0">
          {runtime.map((layer, index) => (
            <li key={layer.id}>
              <LayerBand layer={layer} onOpenModule={onOpenModule} />
              {index < runtime.length - 1 ? (
                <div className="flex flex-col items-center py-1.5" aria-hidden="true">
                  <span className="h-3 w-px bg-border" />
                  <ChevronDown size={12} className="-mt-0.5 text-border" />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      {supporting.length > 0 ? (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            Supporting
          </p>
          <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {supporting.map((layer) => {
              const top = layer.modules[0];
              return (
                <li key={layer.id}>
                  <button
                    type="button"
                    onClick={() => onOpenModule(top?.path ?? "")}
                    className="flex w-full items-center gap-3 bg-surface px-3 py-2.5 text-left transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{layer.label}</span>
                      {top ? (
                        <span className="block truncate font-mono text-[10px] text-muted">
                          {top.path}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
                      {numberFormat.format(layer.fileCount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Language mix by indexed bytes. Segments grow from a shared flex basis so the
 * 2px surface gaps between them never push the track past 100%.
 */
function LanguageComposition({ languages }: { languages: ProjectArchitecture["languages"] }) {
  const shown = languages.slice(0, LANGUAGE_SLOTS);
  const rest = languages.slice(LANGUAGE_SLOTS);
  const segments = [
    ...shown.map((language, index) => ({
      name: language.name,
      share: language.share,
      color: LANGUAGE_COLORS[index],
    })),
    ...(rest.length > 0
      ? [{
          name: `Other (${rest.length})`,
          share: rest.reduce((sum, language) => sum + language.share, 0),
          color: null,
        }]
      : []),
  ];

  return (
    <div>
      <div
        className="flex h-3 gap-[2px] bg-surface"
        role="img"
        aria-label={`Language mix: ${segments
          .map((segment) => `${segment.name} ${segment.share.toFixed(0)}%`)
          .join(", ")}`}
      >
        {segments.map((segment) => (
          <span
            key={segment.name}
            className={`min-w-px ${segment.color ? "series-mark" : "bg-foreground/20"}`}
            style={{
              flex: `${Math.max(segment.share, 0.5)} 0 0`,
              ...seriesStyle(segment.color),
            }}
          />
        ))}
      </div>

      {/* Every segment is directly labelled here — three of the light-mode hues
          sit below 3:1 against the surface, so identity never rests on colour. */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((segment) => (
          <li key={segment.name} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 ${segment.color ? "series-mark" : "bg-foreground/20"}`}
              style={seriesStyle(segment.color)}
            />
            <span>{segment.name}</span>
            <span className="font-mono text-[10px] tabular-nums text-muted">
              {segment.share.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManifestCard({ manifest }: { manifest: ArchitectureManifest }) {
  const shown = manifest.runtime.slice(0, PACKAGES_SHOWN);
  const hidden = manifest.totalCount - shown.length;

  return (
    <div className="bg-surface px-4 py-3.5">
      <div className="flex items-baseline gap-3">
        <Package size={13} aria-hidden="true" className="shrink-0 self-center text-muted" />
        <p className="min-w-0 flex-1 truncate font-mono text-[11px]" title={manifest.path}>
          {manifest.path}
        </p>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {manifest.ecosystem} · {numberFormat.format(manifest.totalCount)}
        </span>
      </div>

      {shown.length > 0 ? (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {shown.map((packageName) => (
            <li
              key={packageName}
              className="max-w-full truncate border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted"
            >
              {packageName}
            </li>
          ))}
          {hidden > 0 ? (
            <li className="px-1 py-0.5 font-mono text-[10px] text-muted">+{hidden} more</li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          {numberFormat.format(manifest.totalCount)} development-only dependencies.
        </p>
      )}
    </div>
  );
}

/**
 * How the project's indexed repository is put together.
 *
 * Everything here is derived from file paths and manifests at the indexed
 * commit — no source contents are read and nothing is generated. Layers are a
 * convention-based reading of the tree, which the footnote states plainly so a
 * judge does not mistake the diagram for a verified fact about the code.
 */
export function ArchitecturePanel({
  architecture,
  hasGithubUrl,
}: {
  architecture: ProjectArchitecture | null;
  /** Distinguishes "no repository linked" from "linked but not indexed". */
  hasGithubUrl: boolean;
}) {
  const [drawerPath, setDrawerPath] = useState<string | null>(null);

  if (!architecture) {
    return (
      <div className="p-5">
        <p className="border border-dashed border-border px-6 py-16 text-center text-xs leading-relaxed text-muted">
          {hasGithubUrl
            ? "This project's repository has not been indexed yet, so there is no file structure to diagram."
            : "This project did not link a GitHub repository, so there is nothing to diagram."}
        </p>
      </div>
    );
  }

  const { repository, layers, languages, manifests } = architecture;

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-8 p-5">
        <header className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-border pb-5">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Repository
            </p>
            <p className="mt-1 truncate text-sm" title={repository.fullName}>
              {repository.fullName}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted">
              {numberFormat.format(architecture.fileCount)} files
              {" · "}
              {formatBytes(architecture.totalBytes)}
              {repository.commitSha ? ` · @ ${repository.commitSha.slice(0, 7)}` : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerPath("")}
              className="flex items-center gap-2 border border-border px-3 py-1.5 text-xs transition-colors hover:border-accent hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <FolderTree size={14} aria-hidden="true" />
              Browse files
            </button>
            <a
              href={`${repository.htmlUrl}/tree/${repository.commitSha ?? repository.defaultBranch}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Open repository on GitHub"
              title="Open repository on GitHub"
              className="shrink-0 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <SiGithub size={20} />
            </a>
          </div>
        </header>

        <section>
          <SectionHeading>Structure</SectionHeading>
          <LayerStack layers={layers} onOpenModule={setDrawerPath} />
          <Note>
            Layers are inferred from where files sit in the tree, not from reading the code.
            A project that names its directories unconventionally will read oddly here — open
            the file browser to check anything the diagram implies.
          </Note>
        </section>

        {languages.length > 0 ? (
          <section>
            <SectionHeading>Languages</SectionHeading>
            <LanguageComposition languages={languages} />
            <Note>Share of indexed source by file size. Binary and vendored files are excluded.</Note>
          </section>
        ) : null}

        {manifests.length > 0 ? (
          <section>
            <SectionHeading>Dependencies</SectionHeading>
            <div className="grid gap-px border border-border bg-border">
              {manifests.map((manifest) => (
                <ManifestCard key={manifest.path} manifest={manifest} />
              ))}
            </div>
            <Note>
              Declared in the repository&rsquo;s manifests at the indexed commit. A declared
              package is not proof it is used, and runtime dependencies are listed first.
            </Note>
          </section>
        ) : null}

        {architecture.truncated ? (
          <p className="border border-amber-400/40 bg-amber-400/[0.07] px-4 py-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            This repository has more files than are indexed here, so the diagram and browser
            show a partial tree. Open it on GitHub for the complete structure.
          </p>
        ) : null}
      </div>

      <RepoFileDrawer
        open={drawerPath !== null}
        onClose={() => setDrawerPath(null)}
        files={architecture.files}
        repository={repository}
        initialPath={drawerPath || undefined}
        truncated={architecture.truncated}
      />
    </MotionConfig>
  );
}
