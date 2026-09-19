export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const delta = Date.now() - then
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (delta < minute) return 'Just now'
  if (delta < hour) {
    const n = Math.floor(delta / minute)
    return n === 1 ? '1 min ago' : `${n} min ago`
  }
  if (delta < day) {
    const n = Math.floor(delta / hour)
    return n === 1 ? '1 hr ago' : `${n} hr ago`
  }
  if (delta < 7 * day) {
    const n = Math.floor(delta / day)
    return n === 1 ? 'Yesterday' : `${n} days ago`
  }
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}
