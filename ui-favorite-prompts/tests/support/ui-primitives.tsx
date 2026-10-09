/**
 * Test double for `@deepseek-ai/dsh-client-ui-primitives`.
 *
 * The published package's Node entry pulls a long chain of browser-only
 * dependencies (shiki, simple-icons, …) that the Web shell supplies at runtime
 * through its module table; loading it under Node is neither possible nor
 * meaningful. These specs assert this plugin's own component behavior, so the
 * one control they need is stubbed with the same public surface.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Minimal stand-in for the primitive Button: same props the plugin passes. */
export function Button({ variant, size, icon, className, children, ...rest }: {
  variant?: 'primary' | 'ghost' | 'outline' | 'toolbar'
  size?: 'md' | 'sm'
  icon?: ReactNode
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  void variant
  void size
  return (
    <button type="button" className={className} {...rest}>
      {icon}
      {children}
    </button>
  )
}
