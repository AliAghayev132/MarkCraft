/**
 * Everything the renderer uses to reach main.
 *
 * Flat on purpose: these are the only modules allowed to touch `window.api`,
 * and a caller should not have to know which of them a given call lives in.
 */

export * from './ai-service'
export * from './app-services'
export * from './events'
export * from './file-service'
export * from './history-service'
export * from './icons-service'
export * from './ipc'
export * from './locale-actions'
export * from './locale-service'
export * from './settings-actions'
export * from './toast-service'
export * from './trash-service'
export * from './types'
