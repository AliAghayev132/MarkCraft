// ── @lib ───────────────────────────────────────────────────────────────────
import { Provider } from '@lib/redux'
import { StrictMode, createRoot } from '@lib/react'

// ── @store ─────────────────────────────────────────────────────────────────
import { store } from '@store'

// ── @components ────────────────────────────────────────────────────────────
import { ErrorBoundary } from '@components'

// ── ./App ──────────────────────────────────────────────────────────────────
import { App } from './App'

// ── @styles ────────────────────────────────────────────────────────────────
import '@styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root container missing from index.html')

/**
 * The native context menu is suppressed application-wide: every right-click in
 * MarkCraft is handled by the custom menu. Text inputs are exempt only where
 * the OS menu genuinely adds value the custom one cannot — currently nowhere,
 * so it is blocked everywhere.
 */
document.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

/** The renderer never navigates; a dropped file is handled by the app itself. */
for (const eventName of ['dragover', 'drop'] as const) {
  document.addEventListener(eventName, (event) => {
    if ((event.target as HTMLElement)?.closest('[data-drop-zone]')) return
    event.preventDefault()
  })
}

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Provider>
  </StrictMode>
)
