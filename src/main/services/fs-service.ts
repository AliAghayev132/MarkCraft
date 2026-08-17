/**
 * The filesystem service.
 *
 * Split by what the operations *do* — describe, read text, change the tree,
 * handle binaries — and re-exported here so the call sites, the IPC handlers
 * and the other services keep one import path.
 */
export * from './fs-entries'
export * from './fs-text'
export * from './fs-mutations'
export * from './fs-assets'
