/**
 * Composer-row balance readout: a compact red amount pill beside the
 * access-mode control. Clicking triggers an immediate refresh independent of
 * the 5-minute poll cycle (both share only the in-flight counter that drives
 * the loading indicator).
 */

import { useEffect, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './BalanceFooter.module.css'

/** Simplified host payload; only the fields the cell renders. */
interface BalancePayload {
  readonly ok?: boolean
  readonly error?: string
  readonly available?: boolean
  readonly currency?: string
  readonly totalBalance?: string
}

interface BalanceView {
  readonly loading: boolean
  readonly data: BalancePayload | undefined
  readonly error: string | undefined
}

const POLL_INTERVAL_MS = 5 * 60 * 1000

function parsePayload(value: unknown): BalancePayload {
  if (typeof value !== 'object' || value === null) return {}
  const record = value as Record<string, unknown>
  return {
    ...(typeof record.ok === 'boolean' ? { ok: record.ok } : {}),
    ...(typeof record.error === 'string' ? { error: record.error } : {}),
    ...(typeof record.available === 'boolean' ? { available: record.available } : {}),
    ...(typeof record.currency === 'string' ? { currency: record.currency } : {}),
    ...(typeof record.totalBalance === 'string' ? { totalBalance: record.totalBalance } : {}),
  }
}

/** Render one composer-row balance cell. */
export function BalanceFooter(_props: PropsRuntime<'conversation.input.left'>) {
  const [view, setView] = useState<BalanceView>({ loading: false, data: undefined, error: undefined })
  const inFlight = useRef(0)

  const refresh = (): void => {
    inFlight.current += 1
    setView(current => ({ ...current, loading: true }))
    fetch('/ds-balance', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const payload = parsePayload(await response.json())
        inFlight.current -= 1
        const ok = payload.ok === true
        setView(current => ({
          ...current,
          loading: inFlight.current > 0,
          data: ok ? payload : current.data,
          error: ok ? undefined : String(payload.error ?? '查询失败'),
        }))
      })
      .catch((error: unknown) => {
        inFlight.current -= 1
        setView(current => ({
          ...current,
          loading: inFlight.current > 0,
          error: error instanceof Error ? error.message : String(error),
        }))
      })
  }

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      window.clearInterval(id)
    }
    // refresh is stable: it only closes over refs and the setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const data = view.data
  const amount = data === undefined
    ? undefined
    : `${data.currency === 'USD' ? '$' : '¥'}${data.totalBalance ?? ''}`
  const title = view.error === undefined
    ? (amount === undefined ? 'DeepSeek 余额查询中' : `DeepSeek 余额 ${amount} · 点击刷新`)
    : `DeepSeek 余额查询失败：${view.error}`

  return (
    <button
      type="button"
      className={css.cell}
      data-loading={view.loading || undefined}
      aria-label={amount === undefined ? 'DeepSeek 余额' : `DeepSeek 余额 ${amount}`}
      title={title}
      onClick={refresh}
    >
      <span className={css.money}>{amount === undefined ? '--' : amount}</span>
      {view.loading ? <span className={css.spinner} aria-hidden /> : null}
    </button>
  )
}
