const packageVersion = process.env.NEXT_PUBLIC_APP_VERSION
if (typeof packageVersion !== 'string' || packageVersion.trim().length === 0) {
  throw new Error('Missing NEXT_PUBLIC_APP_VERSION')
}

export const APP_VERSION = packageVersion.trim()
