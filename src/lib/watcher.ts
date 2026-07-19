import chokidar from 'chokidar';
import { indexFile, deleteDocument } from './indexer';
import { prisma } from './db';

import type { FSWatcher } from 'chokidar';

let watcher: FSWatcher | null = null;
const SUPPORTED_EXTENSIONS = ['.md', '.markdown', '.pdf', '.docx'];

type WatchCallback = (event: 'indexed' | 'deleted' | 'error', data: unknown) => void;
let watchCallbacks: WatchCallback[] = [];

export function onWatchEvent(callback: WatchCallback): () => void {
  watchCallbacks.push(callback);
  return () => {
    watchCallbacks = watchCallbacks.filter((cb) => cb !== callback);
  };
}

function notify(event: 'indexed' | 'deleted' | 'error', data: unknown): void {
  for (const cb of watchCallbacks) {
    try {
      cb(event, data);
    } catch {
      // ignore callback errors
    }
  }
}

/**
 * Start watching a directory for new/changed/deleted files.
 */
export function startWatching(watchDir: string): void {
  if (watcher) {
    watcher.close();
  }

  watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Don't fire 'add' for existing files on startup
    depth: 5,
  });

  watcher.on('add', async (filePath: string) => {
    const ext = '.' + filePath.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) return;

    console.log(`[Watcher] New file detected: ${filePath}`);
    try {
      // Small delay to ensure file is fully written
      await new Promise((r) => setTimeout(r, 500));
      const docId = await indexFile(filePath);
      const doc = await prisma.document.findUnique({
        where: { id: docId },
        include: { keywords: { include: { keyword: true }, take: 10 } },
      });
      notify('indexed', doc);
    } catch (err) {
      console.error(`[Watcher] Error indexing ${filePath}:`, err);
      notify('error', { filePath, error: String(err) });
    }
  });

  watcher.on('change', async (filePath: string) => {
    const ext = '.' + filePath.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) return;

    console.log(`[Watcher] File changed: ${filePath}`);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const docId = await indexFile(filePath);
      const doc = await prisma.document.findUnique({
        where: { id: docId },
        include: { keywords: { include: { keyword: true }, take: 10 } },
      });
      notify('indexed', doc);
    } catch (err) {
      console.error(`[Watcher] Error reindexing ${filePath}:`, err);
      notify('error', { filePath, error: String(err) });
    }
  });

  watcher.on('unlink', async (filePath: string) => {
    console.log(`[Watcher] File deleted: ${filePath}`);
    try {
      const doc = await prisma.document.findUnique({ where: { filePath } });
      if (doc) {
        await deleteDocument(doc.id);
        notify('deleted', { id: doc.id, filePath });
      }
    } catch (err) {
      console.error(`[Watcher] Error removing ${filePath}:`, err);
    }
  });

  console.log(`[Watcher] Watching directory: ${watchDir}`);
}

/**
 * Stop the file watcher.
 */
export function stopWatching(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('[Watcher] Stopped');
  }
}

/**
 * Scan an entire directory and index all supported files (for initial setup).
 */
export async function scanDirectory(dirPath: string): Promise<{ indexed: number; errors: string[] }> {
  const fs = await import('fs');
  const path = await import('path');
  let indexed = 0;
  const errors: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          try {
            await indexFile(fullPath);
            indexed++;
          } catch (err) {
            errors.push(`${fullPath}: ${String(err)}`);
          }
        }
      }
    }
  }

  await walk(dirPath);
  return { indexed, errors };
}