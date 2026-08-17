// ── electron ───────────────────────────────────────────────────────────────
import { Menu, type MenuItemConstructorOptions, app } from 'electron'

// ── ./window ───────────────────────────────────────────────────────────────
import { emitToRenderer } from './main-window'

const send = (commandId: string) => (): void => emitToRenderer('event:command', { commandId })

/**
 * Windows and Linux get no application menu at all — the custom title bar is
 * the menu, and every shortcut is owned by the renderer's keybinding registry.
 *
 * macOS is different: without a menu the OS gives us no Cmd+C/V/Z in native
 * text fields and no standard application menu, both of which users correctly
 * treat as broken. So we install a minimal menu whose non-standard items are
 * thin proxies that dispatch the same command IDs the palette uses.
 */
export function buildApplicationMenu(): Menu | null {
  if (process.platform !== 'darwin') return null

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'Cmd+,', click: send('app.settings') },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Document', accelerator: 'Cmd+N', click: send('file.new') },
        { label: 'Open…', accelerator: 'Cmd+O', click: send('file.open') },
        { label: 'Open Folder…', accelerator: 'Cmd+Shift+O', click: send('file.openFolder') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'Cmd+S', click: send('file.save') },
        { label: 'Save As…', accelerator: 'Cmd+Shift+S', click: send('file.saveAs') },
        { label: 'Save All', accelerator: 'Cmd+Alt+S', click: send('file.saveAll') },
        { type: 'separator' },
        { label: 'Print…', accelerator: 'Cmd+P', click: send('file.print') },
        { label: 'Export…', accelerator: 'Cmd+Shift+E', click: send('file.export') },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'Cmd+W', click: send('tab.close') }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'Cmd+F', click: send('edit.find') },
        { label: 'Replace', accelerator: 'Cmd+Alt+F', click: send('edit.replace') },
        { label: 'Find in Workspace', accelerator: 'Cmd+Shift+F', click: send('edit.findInFiles') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Rich Editor', click: send('view.rich') },
        { label: 'Markdown Source', click: send('view.source') },
        { label: 'Split', click: send('view.split') },
        { label: 'Preview', click: send('view.preview') },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'Cmd+B', click: send('view.toggleSidebar') },
        { label: 'Command Palette', accelerator: 'Cmd+Shift+P', click: send('app.commandPalette') },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
    }
  ]

  return Menu.buildFromTemplate(template)
}
