// ── @shared ────────────────────────────────────────────────────────────────
import type { AppInfo, CardState, DayRecord, HttpRequest, HttpResponse, RunResult, StudyRecord, DeepPartial, ExportRequest, ExportResult, LinkGraphResult, PendingOpen, PinnedFile, PrintRequest, RecentFile, RecentWorkspace, RecoveryRecord, Settings, ShareRequest, WindowState, WorkspaceReplaceRequest, WorkspaceReplaceResponse, WorkspaceSearchRequest, WorkspaceSearchResponse, WorkspaceState } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { soft, unwrap } from './ipc'

export const appService = {
  getInfo(): Promise<AppInfo> {
    return unwrap(window.api.app.getInfo())
  },
  openExternal(url: string): Promise<void> {
    return unwrap(window.api.app.openExternal({ url }))
  },
  setDocumentEdited(edited: boolean): Promise<void> {
    return soft(window.api.app.setDocumentEdited({ edited }), undefined)
  },
  setRepresentedFilename(path: string | null): Promise<void> {
    return soft(window.api.app.setRepresentedFilename({ path }), undefined)
  },
  confirmQuit(allow: boolean): Promise<void> {
    return soft(window.api.app.confirmQuit({ allow }), undefined)
  },
  toggleDevTools(): Promise<void> {
    return soft(window.api.app.toggleDevTools(), undefined)
  },

  /**
   * Collects files the OS supplied before the renderer was listening, and tells
   * main that it now is. Called once, from the bootstrap effect.
   */
  takePendingOpen(): Promise<PendingOpen[]> {
    return soft(window.api.app.takePendingOpen(), [])
  }
}

export const windowService = {
  minimize: (): Promise<void> => soft(window.api.window.minimize(), undefined),
  toggleMaximize: (): Promise<void> => soft(window.api.window.toggleMaximize(), undefined),
  close: (): Promise<void> => soft(window.api.window.close(), undefined),
  getState: (): Promise<WindowState> =>
    soft(window.api.window.getState(), { maximized: false, fullScreen: false, focused: true }),
  setTitle: (title: string): Promise<void> => soft(window.api.window.setTitle({ title }), undefined)
}

export const settingsService = {
  get(): Promise<Settings> {
    return unwrap(window.api.settings.get())
  },
  update(patch: DeepPartial<Settings>): Promise<Settings> {
    return unwrap(window.api.settings.update({ patch }))
  },
  reset(section?: keyof Settings): Promise<Settings> {
    return unwrap(window.api.settings.reset({ section }))
  },
  revealFile(): Promise<void> {
    return soft(window.api.settings.revealFile(), undefined)
  }
}

export const workspaceService = {
  loadState(root: string | null): Promise<WorkspaceState> {
    return unwrap(window.api.workspace.loadState({ root }))
  },
  saveState(state: WorkspaceState): Promise<void> {
    return soft(window.api.workspace.saveState(state), undefined)
  },

  recentFiles: (): Promise<RecentFile[]> => soft(window.api.workspace.recentFiles(), []),
  addRecentFile: (path: string): Promise<RecentFile[]> =>
    soft(window.api.workspace.addRecentFile({ path }), []),
  removeRecentFile: (path: string): Promise<RecentFile[]> =>
    soft(window.api.workspace.removeRecentFile({ path }), []),
  clearRecentFiles: (): Promise<RecentFile[]> => soft(window.api.workspace.clearRecentFiles(), []),

  recentWorkspaces: (): Promise<RecentWorkspace[]> =>
    soft(window.api.workspace.recentWorkspaces(), []),
  addRecentWorkspace: (path: string): Promise<RecentWorkspace[]> =>
    soft(window.api.workspace.addRecentWorkspace({ path }), []),
  removeRecentWorkspace: (path: string): Promise<RecentWorkspace[]> =>
    soft(window.api.workspace.removeRecentWorkspace({ path }), []),
  clearRecentWorkspaces: (): Promise<RecentWorkspace[]> =>
    soft(window.api.workspace.clearRecentWorkspaces(), []),

  pins: (): Promise<PinnedFile[]> => soft(window.api.workspace.pins(), []),
  togglePin: (path: string): Promise<PinnedFile[]> =>
    soft(window.api.workspace.togglePin({ path }), []),

  /**
   * Asks main to re-grant a path from a previous session. Resolves false if it
   * is not in the remembered lists, in which case the caller must not retry.
   */
  authorizeRemembered: (path: string): Promise<boolean> =>
    soft(window.api.workspace.authorizeRemembered({ path }), false)
}

export const recoveryService = {
  list: (): Promise<RecoveryRecord[]> => soft(window.api.recovery.list(), []),
  put: (record: RecoveryRecord): Promise<void> => soft(window.api.recovery.put(record), undefined),
  drop: (id: string): Promise<void> => soft(window.api.recovery.drop({ id }), undefined),
  clear: (): Promise<void> => soft(window.api.recovery.clear(), undefined)
}

export const linksService = {
  graph(root: string): Promise<LinkGraphResult> {
    return unwrap(window.api.links.graph({ root }))
  }
}

export const httpService = {
  send(request: HttpRequest): Promise<HttpResponse> {
    return unwrap(window.api.http.send(request))
  }
}

export const runService = {
  code(language: string, code: string): Promise<RunResult> {
    return unwrap(window.api.run.code({ language, code }))
  }
}

/**
 * Locking and unlocking a document.
 *
 * A thin pass-through on purpose. Every byte of the cryptography is in main,
 * where Node's own implementation is and where a sandboxed page cannot reach
 * it — the renderer's job is to collect a passphrase and hand it over, never
 * to keep it.
 */
export const cryptoService = {
  encrypt(text: string, passphrase: string, hint?: string): Promise<string> {
    return unwrap(window.api.crypto.encrypt({ text, passphrase, hint }))
  },
  decrypt(json: string, passphrase: string): Promise<string> {
    return unwrap(window.api.crypto.decrypt({ json, passphrase }))
  },
  generateKey(): Promise<string> {
    return unwrap(window.api.crypto.generateKey())
  }
}

export const streakService = {
  load(): Promise<DayRecord[]> {
    return soft(window.api.streak.load(), [])
  },
  add(day: string, added: number): Promise<DayRecord[]> {
    return soft(window.api.streak.add({ day, added }), [])
  },
  reset(): Promise<void> {
    return soft(window.api.streak.reset(), undefined)
  }
}

export const studyService = {
  load(path: string): Promise<Record<string, StudyRecord>> {
    return soft(window.api.study.load({ path }), {})
  },
  save(path: string, card: string, state: CardState, due: number): Promise<void> {
    return soft(window.api.study.save({ path, card, state, due }), undefined)
  },
  reset(path: string): Promise<void> {
    return soft(window.api.study.reset({ path }), undefined)
  }
}

export const searchService = {
  workspace(request: WorkspaceSearchRequest): Promise<WorkspaceSearchResponse> {
    return unwrap(window.api.search.workspace(request))
  },
  replace(request: WorkspaceReplaceRequest): Promise<WorkspaceReplaceResponse> {
    return unwrap(window.api.search.replace(request))
  },
  cancel(): Promise<void> {
    return soft(window.api.search.cancel(), undefined)
  }
}

export const outputService = {
  export(request: ExportRequest): Promise<ExportResult> {
    return unwrap(window.api.export.run(request))
  },
  print(request: PrintRequest): Promise<{ printed: boolean }> {
    return unwrap(window.api.print.run(request))
  },
  share(request: ShareRequest): Promise<{ ok: boolean; message: string }> {
    return unwrap(window.api.share.run(request))
  }
}

export const clipboardService = {
  writeText: (text: string): Promise<void> =>
    soft(window.api.clipboard.writeText({ text }), undefined),
  readText: (): Promise<string> => soft(window.api.clipboard.readText(), ''),
  readHtml: (): Promise<string> => soft(window.api.clipboard.readHtml(), ''),
  readImage: (): Promise<{ base64: string; ext: string } | null> =>
    soft(window.api.clipboard.readImage(), null)
}
