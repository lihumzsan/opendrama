import { spawn } from 'node:child_process'
import path from 'node:path'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const concurrentlyCommand = process.platform === 'win32' ? 'concurrently.cmd' : 'concurrently'
const concurrentlyBin = path.join(process.cwd(), 'node_modules', '.bin', concurrentlyCommand)

const childEnv = { ...process.env }

if (Object.prototype.hasOwnProperty.call(childEnv, 'NO_COLOR')) {
  delete childEnv.NO_COLOR
}

let currentChild = null

function run(command, args) {
  return new Promise((resolve, reject) => {
    currentChild = spawn(command, args, {
      env: childEnv,
      stdio: 'inherit',
    })

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
