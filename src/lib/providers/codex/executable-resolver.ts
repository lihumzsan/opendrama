import {
  accessSync,
  constants as fsConstants,
  readdirSync,
  statSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  CODEX_DEFAULT_EXECUTABLE_PATH,
  CODEX_LEGACY_SANDBOX_EXECUTABLE_PATH,
} from './constants'

export type CodexExecutableSource =
  | 'environment'
  | 'provider'
  | 'macos-chatgpt'
  | 'macos-homebrew'
  | 'windows-localappdata'
  | 'windows-legacy'
  | 'path'

export interface CodexExecutableResolution {
  path: string
  source: CodexExecutableSource
}

type CodexResolverEnvironment = Readonly<Record<string, string | undefined>>

export interface CodexExecutableResolverOptions {
  configuredPath?: string
  platform?: NodeJS.Platform
  env?: CodexResolverEnvironment
  homedir?: string
  isFile?: (candidate: string) => boolean
  isExecutable?: (candidate: string) => boolean
  listDirectories?: (directory: string) => Array<{ name: string; mtimeMs: number }>
}

type ResolverContext = Required<Omit<CodexExecutableResolverOptions, 'configuredPath'>>

export class CodexExecutableResolutionError extends Error {
  code: 'CODEX_EXECUTABLE_NOT_FOUND' | 'CODEX_EXECUTABLE_NOT_EXECUTABLE'
  attemptedPaths: string[]

  constructor(
    code: 'CODEX_EXECUTABLE_NOT_FOUND' | 'CODEX_EXECUTABLE_NOT_EXECUTABLE',
    message: string,
    attemptedPaths: string[],
  ) {
    super(`${code}: ${message}`)
    this.name = 'CodexExecutableResolutionError'
    this.code = code
    this.attemptedPaths = attemptedPaths
  }
}

function defaultIsFile(candidate: string): boolean {
  try {
    return statSync(candidate).isFile()
  } catch {
    return false
  }
}

function defaultIsExecutable(candidate: string): boolean {
  try {
    accessSync(candidate, fsConstants.X_OK)
    return true
  } catch {
    return false
  }
}

function defaultListDirectories(directory: string): Array<{ name: string; mtimeMs: number }> {
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const entryPath = path.join(directory, entry.name)
        return {
          name: entry.name,
          mtimeMs: statSync(entryPath).mtimeMs,
        }
      })
  } catch {
    return []
  }
}

function readEnvironmentValue(env: CodexResolverEnvironment, key: string): string | undefined {
  const direct = env[key]
  if (direct) return direct
  const matchedKey = Object.keys(env).find((candidate) => candidate.toLowerCase() === key.toLowerCase())
  return matchedKey ? env[matchedKey] : undefined
}

function expandEnvironmentVariables(input: string, env: CodexResolverEnvironment): string {
  return input.replace(/%([^%]+)%/g, (match, name: string) => {
    return readEnvironmentValue(env, name) || match
  })
}

function expandHome(input: string, homedir: string, platform: NodeJS.Platform): string {
  if (input === '~') return homedir
  if (input.startsWith('~/') || (platform === 'win32' && input.startsWith('~\\'))) {
    return pathForPlatform(platform).join(homedir, input.slice(2))
  }
  return input
}

function pathForPlatform(platform: NodeJS.Platform): typeof path.posix | typeof path.win32 {
  return platform === 'win32' ? path.win32 : path.posix
}

function expandConfiguredPath(
  input: string,
  context: Pick<ResolverContext, 'env' | 'homedir' | 'platform'>,
): string {
  return expandHome(
    expandEnvironmentVariables(input.trim(), context.env),
    context.homedir,
    context.platform,
  )
}

function normalizeAutoSentinel(input: string): string {
  return input.trim().replace(/\//g, '\\').toLowerCase()
}

export function isCodexAutoPath(value?: string): boolean {
  const normalized = normalizeAutoSentinel(value || '')
  if (!normalized || normalized === 'auto') return true
  return normalized === normalizeAutoSentinel(CODEX_DEFAULT_EXECUTABLE_PATH)
    || normalized === normalizeAutoSentinel(CODEX_LEGACY_SANDBOX_EXECUTABLE_PATH)
}

function validateExplicitPath(
  candidate: string,
  source: 'environment' | 'provider',
  context: ResolverContext,
): CodexExecutableResolution {
  if (!context.isFile(candidate)) {
    throw new CodexExecutableResolutionError(
      'CODEX_EXECUTABLE_NOT_FOUND',
      `Codex executable was not found at ${candidate}`,
      [candidate],
    )
  }
  if (context.platform !== 'win32' && !context.isExecutable(candidate)) {
    throw new CodexExecutableResolutionError(
      'CODEX_EXECUTABLE_NOT_EXECUTABLE',
      `Codex executable is not executable at ${candidate}`,
      [candidate],
    )
  }
  return { path: candidate, source }
}

function macCandidates(context: ResolverContext): CodexExecutableResolution[] {
  const candidates: CodexExecutableResolution[] = [
    {
      path: '/Applications/ChatGPT.app/Contents/Resources/codex',
      source: 'macos-chatgpt',
    },
    {
      path: path.posix.join(context.homedir, 'Applications', 'ChatGPT.app', 'Contents', 'Resources', 'codex'),
      source: 'macos-chatgpt',
    },
    {
      path: '/opt/homebrew/bin/codex',
      source: 'macos-homebrew',
    },
    {
      path: '/usr/local/bin/codex',
      source: 'macos-homebrew',
    },
  ]
  return candidates
}

function windowsCandidates(context: ResolverContext): CodexExecutableResolution[] {
  const candidates: CodexExecutableResolution[] = []
  const localAppData = readEnvironmentValue(context.env, 'LOCALAPPDATA')
  if (localAppData) {
    const binDirectory = path.win32.join(localAppData, 'OpenAI', 'Codex', 'bin')
    const versioned = context.listDirectories(binDirectory)
      .sort((left, right) => right.mtimeMs - left.mtimeMs)
      .map((entry) => ({
        path: path.win32.join(binDirectory, entry.name, 'codex.exe'),
        source: 'windows-localappdata' as const,
      }))
    candidates.push(...versioned)
    candidates.push({
      path: path.win32.join(binDirectory, 'codex.exe'),
      source: 'windows-localappdata',
    })
  }

  const userProfile = readEnvironmentValue(context.env, 'USERPROFILE')
  if (userProfile) {
    candidates.push({
      path: path.win32.join(userProfile, '.codex', '.sandbox-bin', 'codex.exe'),
      source: 'windows-legacy',
    })
  }
  return candidates
}

function pathCandidates(context: ResolverContext): CodexExecutableResolution[] {
  const rawPath = readEnvironmentValue(context.env, 'PATH')
  if (!rawPath) return []
  const platformPath = pathForPlatform(context.platform)
  const pathEntries = rawPath
    .split(platformPath.delimiter)
    .map((entry) => entry.trim().replace(/^"(.*)"$/, '$1'))
    .filter(Boolean)

  if (context.platform !== 'win32') {
    return pathEntries.map((directory) => ({
      path: platformPath.join(directory, 'codex'),
      source: 'path',
    }))
  }

  const rawPathExt = readEnvironmentValue(context.env, 'PATHEXT') || '.COM;.EXE;.BAT;.CMD'
  const extensions = rawPathExt
    .split(';')
    .map((extension) => extension.trim())
    .filter(Boolean)
    .map((extension) => extension.startsWith('.') ? extension : `.${extension}`)

  return pathEntries.flatMap((directory) =>
    extensions.map((extension) => ({
      path: path.win32.join(directory, `codex${extension}`),
      source: 'path' as const,
    })),
  )
}

function automaticCandidates(context: ResolverContext): CodexExecutableResolution[] {
  const platformCandidates = context.platform === 'darwin'
    ? macCandidates(context)
    : context.platform === 'win32'
      ? windowsCandidates(context)
      : []
  return [...platformCandidates, ...pathCandidates(context)]
}

export function resolveCodexExecutable(
  options: CodexExecutableResolverOptions = {},
): CodexExecutableResolution {
  const context: ResolverContext = {
    platform: options.platform || process.platform,
    env: options.env || process.env,
    homedir: options.homedir || os.homedir(),
    isFile: options.isFile || defaultIsFile,
    isExecutable: options.isExecutable || defaultIsExecutable,
    listDirectories: options.listDirectories || defaultListDirectories,
  }

  const environmentPath = readEnvironmentValue(context.env, 'CODEX_CLI_PATH')?.trim()
  if (environmentPath) {
    return validateExplicitPath(
      expandConfiguredPath(environmentPath, context),
      'environment',
      context,
    )
  }

  const configuredPath = options.configuredPath?.trim()
  if (configuredPath && !isCodexAutoPath(configuredPath)) {
    return validateExplicitPath(
      expandConfiguredPath(configuredPath, context),
      'provider',
      context,
    )
  }

  const candidates = automaticCandidates(context)
  const attemptedPaths: string[] = []
  const nonExecutablePaths: string[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    const comparisonKey = context.platform === 'win32'
      ? candidate.path.toLowerCase()
      : candidate.path
    if (seen.has(comparisonKey)) continue
    seen.add(comparisonKey)
    attemptedPaths.push(candidate.path)

    if (!context.isFile(candidate.path)) continue
    if (context.platform !== 'win32' && !context.isExecutable(candidate.path)) {
      nonExecutablePaths.push(candidate.path)
      continue
    }
    return candidate
  }

  if (nonExecutablePaths.length > 0) {
    throw new CodexExecutableResolutionError(
      'CODEX_EXECUTABLE_NOT_EXECUTABLE',
      `Codex executable is not executable at ${nonExecutablePaths[0]}`,
      nonExecutablePaths,
    )
  }
  throw new CodexExecutableResolutionError(
    'CODEX_EXECUTABLE_NOT_FOUND',
    'Codex executable was not found in automatic discovery locations',
    attemptedPaths,
  )
}
