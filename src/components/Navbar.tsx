'use client'

import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from './LanguageSwitcher'
import { AppIcon } from '@/components/ui/icons'
import { Link } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'
import { APP_VERSION } from '@/lib/app-meta'


export default function Navbar() {
  const { data: session, status } = useSession()
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const currentVersion = APP_VERSION
  const downloadLogsHref = '/api/admin/download-logs'

  return (
    <nav className="glass-nav sticky top-0 z-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <Link href={session ? buildAuthenticatedHomeTarget() : { pathname: '/' }} className="group shrink-0">
              <Image
                src="/logo-small.png"
                alt={tc('appName')}
                width={80}
                height={80}
                priority
                className="h-auto w-10 object-contain transition-transform group-hover:scale-110 sm:w-20"
              />
            </Link>
            <button
              type="button"
              className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] px-2 py-1 text-[11px] font-semibold tracking-[0.02em] text-[var(--glass-text-secondary)] transition-all hover:border-[var(--glass-stroke-focus)] hover:text-[var(--glass-text-primary)] sm:px-3"
            >
              <span className="inline-flex items-center gap-1.5">
                <AppIcon name="sparkles" className="h-3.5 w-3.5" />
                {tc('betaVersion', { version: currentVersion })}
              </span>
            </button>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-6">
              {status === 'loading' ? (
                /* Session 加载中骨架屏 */
                <div className="flex items-center space-x-4">
                  <div className="h-4 w-16 rounded-full bg-[var(--glass-bg-muted)] animate-pulse" />
                  <div className="h-4 w-16 rounded-full bg-[var(--glass-bg-muted)] animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-[var(--glass-bg-muted)] animate-pulse" />
                </div>
              ) : session ? (
                <>
                  <Link
                    href={{ pathname: '/workspace' }}
                    className="shrink-0 p-1 text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors flex items-center gap-1 sm:p-0"
                    title={t('workspace')}
                  >
                    <AppIcon name="monitor" className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('workspace')}</span>
                  </Link>
                  <Link
                    href={{ pathname: '/workspace/video-tools' }}
                    className="shrink-0 p-1 text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors flex items-center gap-1 sm:p-0"
                    title={t('videoTools')}
                  >
                    <AppIcon name="film" className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('videoTools')}</span>
                  </Link>
                  <Link
                    href={{ pathname: '/workspace/asset-hub' }}
                    className="shrink-0 p-1 text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors flex items-center gap-1 sm:p-0"
                    title={t('assetHub')}
                  >
                    <AppIcon name="folderHeart" className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('assetHub')}</span>
                  </Link>
                  <Link
                    href={{ pathname: '/profile' }}
                    className="shrink-0 p-1 text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors flex items-center gap-1 sm:p-0"
                    title={t('profile')}
                  >
                    <AppIcon name="userRoundCog" className="w-5 h-5" />
                    <span className="hidden sm:inline">{t('profile')}</span>
                  </Link>
                  <LanguageSwitcher />
                  <a
                    href={downloadLogsHref}
                    download
                    className="shrink-0 p-1 text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors flex items-center gap-1 sm:p-0"
                    title={t('downloadLogs')}
                  >
                    <AppIcon name="download" className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('downloadLogs')}</span>
                  </a>
                </>

              ) : (
                <>
                  <Link
                    href={{ pathname: '/auth/signin' }}
                    className="text-sm text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] font-medium transition-colors"
                  >
                    {t('signin')}
                  </Link>
                  <Link
                    href={{ pathname: '/auth/signup' }}
                    className="glass-btn-base glass-btn-primary px-4 py-2 text-sm font-medium"
                  >
                    {t('signup')}
                  </Link>
                  <LanguageSwitcher />
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
  )
}
