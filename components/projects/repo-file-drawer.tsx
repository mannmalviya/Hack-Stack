"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, File, Folder, FolderOpen, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DUR, EASE_OUT } from "@/components/motion/tokens";
import type { ArchitectureFile, ProjectArchitecture } from "@/lib/architecture/project-architecture";

type Repository = ProjectArchitecture["repository"];

type TreeNode =
  | { type: "dir"; name: string; path: string; children: TreeNode[]; fileCount: number }
  | { type: "file"; name: string; path: string; language: string | null; sizeBytes: number };

const MATCH_LIMIT = 300;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Pins every link to the indexed commit so the browser matches what was analysed. */
function githubUrl(repository: Repository, path: string, type: "dir" | "file") {
  const ref = repository.commitSha ?? repository.defaultBranch;
  return `${repository.htmlUrl}/${type === "dir" ? "tree" : "blob"}/${ref}/${path}`;
}

function repositoryRootUrl(repository: Repository) {
  return `${repository.htmlUrl}/tree/${repository.commitSha ?? repository.defaultBranch}`;
}

/** A directory path plus every directory above it: `a/b/c` → `a/b/c`, `a/b`, `a`. */
function selfAndAncestors(directory: string) {
  if (directory === "") return [];
  const segments = directory.split("/");
  return segments.map((_, index) => segments.slice(0, segments.length - index).join("/"));
}

/** Assembles the flat indexed path list into a directory tree, folders first. */
function buildTree(files: ArchitectureFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const directories = new Map<string, Extract<TreeNode, { type: "dir" }>>();

  const directoryAt = (path: string): TreeNode[] => {
    if (path === "") return root;
    const existing = directories.get(path);
    if (existing) return existing.children;

    const slash = path.lastIndexOf("/");
    const node: Extract<TreeNode, { type: "dir" }> = {
      type: "dir",
      name: path.slice(slash + 1),
      path,
      children: [],
      fileCount: 0,
    };
    directories.set(path, node);
    directoryAt(path.slice(0, Math.max(0, slash))).push(node);
    return node.children;
  };

  for (const file of files) {
    const slash = file.path.lastIndexOf("/");
    const parent = slash === -1 ? "" : file.path.slice(0, slash);
    directoryAt(parent).push({
      type: "file",
      name: file.path.slice(slash + 1),
      path: file.path,
      language: file.language,
      sizeBytes: file.sizeBytes,
    });
    // Roll the count up every ancestor so a collapsed folder still says how
    // much it hides.
    for (const ancestor of selfAndAncestors(parent)) {
      const directory = directories.get(ancestor);
      if (directory) directory.fileCount += 1;
    }
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((left, right) =>
      (left.type === right.type ? 0 : left.type === "dir" ? -1 : 1)
      || left.name.localeCompare(right.name));
    for (const node of nodes) if (node.type === "dir") sort(node.children);
  };
  sort(root);

  return root;
}

function TreeRow({
  node,
  depth,
  repository,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  repository: Repository;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}) {
  // Indent with padding rather than nested margins so the hover and focus
  // background still spans the full row width at every depth.
  const indent = { paddingLeft: `${depth * 0.875 + 0.75}rem` };

  if (node.type === "file") {
    return (
      <li>
        <a
          href={githubUrl(repository, node.path, "file")}
          target="_blank"
          rel="noreferrer"
          style={indent}
          className="group flex items-center gap-2 py-1.5 pr-3 text-sm transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:bg-foreground/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50"
        >
          <File size={14} aria-hidden="true" className="shrink-0 text-muted" />
          <span className="truncate">{node.name}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {formatBytes(node.sizeBytes)}
          </span>
        </a>
      </li>
    );
  }

  const isOpen = expanded.has(node.path);
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        aria-expanded={isOpen}
        style={indent}
        className="flex w-full items-center gap-2 py-1.5 pr-3 text-left text-sm transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:bg-foreground/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50"
      >
        <ChevronRight
          size={12}
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        {isOpen
          ? <FolderOpen size={14} aria-hidden="true" className="shrink-0 text-accent" />
          : <Folder size={14} aria-hidden="true" className="shrink-0 text-accent" />}
        <span className="truncate">{node.name}</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-muted">
          {node.fileCount}
        </span>
      </button>

      {isOpen ? (
        <ul>
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              repository={repository}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * The drawer's contents. Split out and keyed by `initialPath` in the parent so
 * both the expansion set and the filter can be plain initial state.
 */
function FileBrowser({
  files,
  repository,
  initialPath,
  truncated,
  onClose,
  searchRef,
}: {
  files: ArchitectureFile[];
  repository: Repository;
  initialPath?: string;
  truncated: boolean;
  onClose: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [query, setQuery] = useState("");
  // Top level open by default — the useful starting view for an unfamiliar
  // repository — plus the path the diagram asked for, if any.
  const [expanded, setExpanded] = useState(() => {
    const initial = new Set(
      tree.filter((node) => node.type === "dir").map((node) => node.path),
    );
    if (initialPath) for (const ancestor of selfAndAncestors(initialPath)) initial.add(ancestor);
    return initial;
  });

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    return files.filter((file) => file.path.toLowerCase().includes(needle));
  }, [files, query]);

  const toggle = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  return (
    <>
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              File structure
            </p>
            <p className="truncate text-sm" title={repository.fullName}>
              {repository.fullName}
            </p>
          </div>
          <a
            href={repositoryRootUrl(repository)}
            target="_blank"
            rel="noreferrer"
            aria-label="Open repository on GitHub"
            title="Open repository on GitHub"
            className="shrink-0 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <SiGithub size={18} />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close file browser"
            className="shrink-0 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 border border-border px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-accent/50">
          <Search size={14} aria-hidden="true" className="shrink-0 text-muted" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by path"
            aria-label="Filter files by path"
            className="w-full bg-transparent text-sm placeholder:text-muted focus:outline-none"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {matches ? (
          matches.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted">
              No files match “{query.trim()}”.
            </p>
          ) : (
            <ul>
              {matches.slice(0, MATCH_LIMIT).map((file) => (
                <li key={file.path}>
                  <a
                    href={githubUrl(repository, file.path, "file")}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:bg-foreground/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50"
                  >
                    <File size={14} aria-hidden="true" className="shrink-0 text-muted" />
                    <span className="truncate" title={file.path}>
                      {file.path}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul>
            {tree.map((node) => (
              <TreeRow
                key={node.path}
                node={node}
                depth={0}
                repository={repository}
                expanded={expanded}
                onToggle={toggle}
              />
            ))}
          </ul>
        )}
      </div>

      <footer
        aria-live="polite"
        className="shrink-0 border-t border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
      >
        {matches
          ? `${matches.length} match${matches.length === 1 ? "" : "es"}`
            + (matches.length > MATCH_LIMIT ? ` · showing first ${MATCH_LIMIT}` : "")
          : `${files.length} files${truncated ? " · truncated" : ""}`}
      </footer>
    </>
  );
}

/**
 * Slide-over browser for the indexed file list.
 *
 * Controlled by the architecture panel so a module in the diagram can open the
 * tree already expanded at that directory. Every row links out to GitHub at the
 * indexed commit rather than trying to render contents the indexer never stored.
 */
export function RepoFileDrawer({
  open,
  onClose,
  files,
  repository,
  initialPath,
  truncated,
}: {
  open: boolean;
  onClose: () => void;
  files: ArchitectureFile[];
  repository: Repository;
  /** Directory to reveal when opened, e.g. from a module in the diagram. */
  initialPath?: string;
  truncated: boolean;
}) {
  const reduce = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // Move focus into the drawer and hand it back to whatever opened it, so
  // keyboard users are never dropped at the top of the page on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // The drawer covers the viewport, so let it own scrolling while it is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-[2px]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Files in ${repository.fullName}`}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
          >
            {/* Keyed so reopening at a different module remounts with that
                directory revealed, rather than syncing state in an effect. */}
            <FileBrowser
              key={initialPath ?? ""}
              files={files}
              repository={repository}
              initialPath={initialPath}
              truncated={truncated}
              onClose={onClose}
              searchRef={searchRef}
            />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
