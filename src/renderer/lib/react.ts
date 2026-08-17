/**
 * React runtime and types.
 *
 * The JSX transform still resolves `react/jsx-runtime` on its own — that is
 * emitted by the compiler and is not something application code imports — but
 * every explicit React binding comes through here.
 */

export {
  Children,
  Component,
  Fragment,
  StrictMode,
  Suspense,
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition
} from 'react'

export type {
  ButtonHTMLAttributes,
  ComponentProps,
  ComponentType,
  CSSProperties,
  Dispatch,
  DragEvent,
  ErrorInfo,
  FocusEvent,
  HTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  MutableRefObject,
  PointerEvent,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
  SetStateAction,
  SVGProps,
  TextareaHTMLAttributes
} from 'react'

export { createPortal, flushSync } from 'react-dom'
export { createRoot } from 'react-dom/client'
