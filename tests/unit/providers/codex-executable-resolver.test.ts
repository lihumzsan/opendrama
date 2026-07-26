import { describe, expect, it } from 'vitest'
import {
  CODEX_DEFAULT_EXECUTABLE_PATH,
  CODEX_LEGACY_SANDBOX_EXECUTABLE_PATH,
} from '@/lib/providers/codex/constants'
import {
  CodexExecutableResolutionError,
  isCodexAutoPath,
  resolveCodexExecutable,
  type CodexExecutableResolverOptions,
} from '@/lib/providers/codex/executable-resolver'

function resolverOptions(input: {
  platform: NodeJS.Platform
  files?: string[]
  executables?: string[]
  env?: CodexExecutableResolverOptions['env']
  homedir?: string
  directories?: Record<string, Array<{ name: string; mtimeMs: number }>>
}): CodexExecutableResolverOptions {
  const files = new Set(input.files || [])
  const executables = new Set(input.executables || input.files || [])
  return {
    platform: input.platform,
    env: input.env || {},
    homedir: input.homedir || (input.platform === 'win32' ? 'C:\\Users\\Unit' : '/Users/unit'),
    isFile: (candidate) => files.has(candidate),
    isExecutable: (candidate) => executables.has(candidate),
    listDirectories: (directory) => input.directories?.[directory] || [],
  }
}

describe('Codex executable resolver', () => {
  it('uses CODEX_CLI_PATH before a saved provider path', () => {
    const options = resolverOptions({
      platform: 'darwin',
      env: { CODEX_CLI_PATH: '/operator/codex' },
      files: ['/operator/codex', '/provider/codex'],
    })

    expect(resolveCodexExecutable({
      ...options,
      configuredPath: '/provider/codex',
    })).toEqual({
      path: '/operator/codex',
      source: 'environment',
    })
  })

  it('rejects an invalid CODEX_CLI_PATH instead of falling back', () => {
    const options = resolverOptions({
      platform: 'darwin',
      env: { CODEX_CLI_PATH: '/missing/codex' },
      files: ['/Applications/ChatGPT.app/Contents/Resources/codex'],
    })

    expect(() => resolveCodexExecutable(options)).toThrowError(
      expect.objectContaining({
        code: 'CODEX_EXECUTABLE_NOT_FOUND',
        attemptedPaths: ['/missing/codex'],
      }),
    )
  })

  it('rejects an invalid saved provider path instead of falling back', () => {
    const options = resolverOptions({
      platform: 'darwin',
      files: ['/Applications/ChatGPT.app/Contents/Resources/codex'],
    })

    expect(() => resolveCodexExecutable({
      ...options,
      configuredPath: '/missing/provider-codex',
    })).toThrowError(
      expect.objectContaining({
        code: 'CODEX_EXECUTABLE_NOT_FOUND',
        attemptedPaths: ['/missing/provider-codex'],
      }),
    )
  })

  it('treats historical Windows defaults as automatic discovery sentinels', () => {
    expect(isCodexAutoPath(CODEX_DEFAULT_EXECUTABLE_PATH)).toBe(true)
    expect(isCodexAutoPath(CODEX_LEGACY_SANDBOX_EXECUTABLE_PATH)).toBe(true)
    expect(isCodexAutoPath('auto')).toBe(true)
    expect(isCodexAutoPath('')).toBe(true)
    expect(isCodexAutoPath('/custom/codex')).toBe(false)
  })

  it('discovers the system ChatGPT bundle on macOS', () => {
    const executablePath = '/Applications/ChatGPT.app/Contents/Resources/codex'
    const options = resolverOptions({
      platform: 'darwin',
      files: [executablePath],
    })

    expect(resolveCodexExecutable(options)).toEqual({
      path: executablePath,
      source: 'macos-chatgpt',
    })
  })

  it('discovers the user ChatGPT bundle on macOS', () => {
    const executablePath = '/Users/unit/Applications/ChatGPT.app/Contents/Resources/codex'
    const options = resolverOptions({
      platform: 'darwin',
      homedir: '/Users/unit',
      files: [executablePath],
    })

    expect(resolveCodexExecutable(options)).toEqual({
      path: executablePath,
      source: 'macos-chatgpt',
    })
  })

  it('discovers common Homebrew installations on macOS', () => {
    const executablePath = '/opt/homebrew/bin/codex'
    const options = resolverOptions({
      platform: 'darwin',
      files: [executablePath],
    })

    expect(resolveCodexExecutable(options)).toEqual({
      path: executablePath,
      source: 'macos-homebrew',
    })
  })

  it('discovers Codex through a POSIX PATH entry', () => {
    const executablePath = '/custom/bin/codex'
    const options = resolverOptions({
      platform: 'darwin',
      env: { PATH: '/custom/bin:/usr/bin' },
      files: [executablePath],
    })

    expect(resolveCodexExecutable(options)).toEqual({
      path: executablePath,
      source: 'path',
    })
  })

  it('prefers the newest versioned Windows desktop installation', () => {
    const binDirectory = 'C:\\Users\\Unit\\AppData\\Local\\OpenAI\\Codex\\bin'
    const executablePath = `${binDirectory}\\2.0.0\\codex.exe`
    const options = resolverOptions({
      platform: 'win32',
      env: { LOCALAPPDATA: 'C:\\Users\\Unit\\AppData\\Local' },
      files: [executablePath],
      directories: {
        [binDirectory]: [
          { name: '1.0.0', mtimeMs: 100 },
          { name: '2.0.0', mtimeMs: 200 },
        ],
      },
    })

    expect(resolveCodexExecutable(options)).toEqual({
      path: executablePath,
      source: 'windows-localappdata',
    })
  })

  it('discovers the legacy Windows sandbox installation', () => {
    const executablePath = 'C:\\Users\\Unit\\.codex\\.sandbox-bin\\codex.exe'
    const options = resolverOptions({
      platform: 'win32',
      env: { USERPROFILE: 'C:\\Users\\Unit' },
      files: [executablePath],
    })

    expect(resolveCodexExecutable(options)).toEqual({
      path: executablePath,
      source: 'windows-legacy',
    })
  })

  it('uses PATHEXT while scanning PATH on Windows', () => {
    const executablePath = 'C:\\Tools\\codex.CMD'
    const options = resolverOptions({
      platform: 'win32',
      env: {
        PATH: 'C:\\Tools;C:\\Windows\\System32',
        PATHEXT: '.CMD;.EXE',
      },
      files: [executablePath],
    })

    expect(resolveCodexExecutable(options)).toEqual({
      path: executablePath,
      source: 'path',
    })
  })

  it('preserves spaces in an explicit executable path', () => {
    const executablePath = '/Users/unit/My Tools/codex'
    const options = resolverOptions({
      platform: 'darwin',
      files: [executablePath],
    })

    expect(resolveCodexExecutable({
      ...options,
      configuredPath: executablePath,
    })).toEqual({
      path: executablePath,
      source: 'provider',
    })
  })

  it('expands Windows environment variables in an explicit path', () => {
    const executablePath = 'C:\\Users\\Unit\\Tools\\codex.exe'
    const options = resolverOptions({
      platform: 'win32',
      env: { USERPROFILE: 'C:\\Users\\Unit' },
      files: [executablePath],
    })

    expect(resolveCodexExecutable({
      ...options,
      configuredPath: '%USERPROFILE%\\Tools\\codex.exe',
    })).toEqual({
      path: executablePath,
      source: 'provider',
    })
  })

  it('rejects a non-executable POSIX file', () => {
    const executablePath = '/Applications/ChatGPT.app/Contents/Resources/codex'
    const options = resolverOptions({
      platform: 'darwin',
      files: [executablePath],
      executables: [],
    })

    expect(() => resolveCodexExecutable(options)).toThrowError(
      expect.objectContaining({
        code: 'CODEX_EXECUTABLE_NOT_EXECUTABLE',
        attemptedPaths: [executablePath],
      }),
    )
  })

  it('reports every automatic candidate when no installation exists', () => {
    const options = resolverOptions({
      platform: 'darwin',
      env: { PATH: '/custom/bin' },
    })

    try {
      resolveCodexExecutable(options)
      throw new Error('expected resolution to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(CodexExecutableResolutionError)
      expect(error).toMatchObject({
        code: 'CODEX_EXECUTABLE_NOT_FOUND',
      })
      expect((error as CodexExecutableResolutionError).attemptedPaths).toContain(
        '/Applications/ChatGPT.app/Contents/Resources/codex',
      )
      expect((error as CodexExecutableResolutionError).attemptedPaths).toContain(
        '/custom/bin/codex',
      )
    }
  })
})
