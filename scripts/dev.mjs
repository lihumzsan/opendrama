import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function resolveNpmCommand() {
  if (process.env.OPENDRAMA_NPM_CMD) {
    return process.env.OPENDRAMA_NPM_CMD
  }

  if (process.platform !== 'win32') {
    return 'npm'
  }

  const npmFromNodeInstall = path.join(path.dirname(process.execPath), 'npm.cmd')
  if (fs.existsSync(npmFromNodeInstall)) {
    return npmFromNodeInstall
  }

  return 'npm.cmd'
}

const npmCommand = resolveNpmCommand()
const concurrentlyCommand = process.platform === 'win32' ? 'concurrently.cmd' : 'concurrently'
const concurrentlyBin = path.join(process.cwd(), 'node_modules', '.bin', concurrentlyCommand)

const childEnv = { ...process.env }

if (Object.prototype.hasOwnProperty.call(childEnv, 'NO_COLOR')) {
  delete childEnv.NO_COLOR
}

let currentChild = null

function getChildStdio() {
  if (process.stdin.isTTY && process.stdout.isTTY && process.stderr.isTTY) {
    return 'inherit'
  }

  return ['ignore', 'pipe', 'pipe']
}

function quoteCmdArg(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function getSpawnInvocation(command, args) {
  if (process.platform !== 'win32' || !/\.(?:cmd|bat)$/i.test(command)) {
    return { command, args, windowsVerbatimArguments: false }
  }

  const commandLine = [quoteCmdArg(command), ...args.map(quoteCmdArg)].join(' ')

  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: [
      '/d',
      '/c',
      `"${commandLine}"`,
    ],
    windowsVerbatimArguments: true,
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const invocation = getSpawnInvocation(command, args)

    currentChild = spawn(invocation.command, invocation.args, {
      env: childEnv,
      stdio: getChildStdio(),
      windowsVerbatimArguments: invocation.windowsVerbatimArguments,
    })

    if (currentChild.stdout) {
      currentChild.stdout.pipe(process.stdout)
    }
    if (currentChild.stderr) {
      currentChild.stderr.pipe(process.stderr)
    }

    currentChild.on('error', reject)
    currentChild.on('exit', (code, signal) => {
      currentChild = null

      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`))
        return
      }

      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

function stopCurrentChild(signal) {
  if (currentChild && !currentChild.killed) {
    currentChild.kill(signal)
  }
}

process.on('SIGINT', () => {
  stopCurrentChild('SIGINT')
})

process.on('SIGTERM', () => {
  stopCurrentChild('SIGTERM')
})

try {
  await run(npmCommand, ['run', 'dev:prepare'])
  await run(npmCommand, ['run', 'storage:init'])
  await run(concurrentlyBin, [
    'npm run dev:next',
    'npm run dev:worker',
    'npm run dev:watchdog',
    'npm run dev:board',
  ])
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error(error)
  }

  process.exit(1)
}
