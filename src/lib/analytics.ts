import posthog from 'posthog-js'

const key  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined

if (key) {
  posthog.init(key, {
    api_host:         host || 'https://us.i.posthog.com',
    capture_pageview: true,
    persistence:      'localStorage',
    autocapture:      false,
  })
}

export const analytics = {
  identify(userId: string, props?: Record<string, unknown>) {
    if (!key) return
    posthog.identify(userId, props)
  },

  track(event: string, props?: Record<string, unknown>) {
    if (!key) return
    posthog.capture(event, props)
  },

  page(name: string) {
    if (!key) return
    posthog.capture('$pageview', { page: name })
  },

  reset() {
    if (!key) return
    posthog.reset()
  },
}
