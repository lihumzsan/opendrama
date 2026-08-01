# OpenDrama Dev 启动脚本设计

## 目标

让 Windows 用户双击根目录的 `start-opendrama-dev.bat` 即可可靠地以开发模式启动 OpenDrama。若项目端口已被占用，脚本只清理 OpenDrama 明确需要的 `3000` 和 `3010` 端口，然后重新启动全部开发服务。

## 采用方案

保留单文件 BAT 入口，不增加 PowerShell 或 Python 辅助文件。BAT 使用 Windows 自带的 PowerShell 查询监听端口对应的 PID，再通过 `taskkill /T /F` 结束进程树。脚本继续以前台方式运行 `npm.cmd run dev`，让用户可以直接看到日志并用 `Ctrl+C` 停止服务。

没有采用以下方案：

- BAT 调用独立 PowerShell 脚本：逻辑更易维护，但会增加必须同步分发的文件。
- BAT 调用 Python 重启助手：已有工具可复用，但会额外要求本机 Python 环境。

## 启动流程

1. 定位 BAT 所在目录并确认 `package.json` 存在。
2. 确认 `npm.cmd` 可用。
3. `.env` 不存在时，从 `.env.example` 自动复制；若模板也不存在则失败退出。
4. `node_modules` 不存在时执行 `npm.cmd ci`；安装失败则保留现有服务并退出。
5. 检查 `ffmpeg` 和 `ffprobe`。
6. `--check` 模式到此成功退出，不停止端口、不启动服务。
7. 查询并结束 `3000`、`3010` 的监听进程树。
8. 再次确认两个端口已释放；若仍被占用则失败退出。
9. 执行 `npm.cmd run dev`，启动 Next.js、Worker、Watchdog 和 Bull Board。

## 安全边界与错误处理

- 只处理 TCP 监听端口 `3000` 和 `3010`，不扫描或停止其他端口。
- 在依赖和工具检查完成前不停止现有服务，避免安装失败造成无谓中断。
- 显示每个被停止的 PID 和端口。
- 任何前置条件、依赖安装、进程终止或端口释放失败都会返回非零退出码，并保留窗口供双击用户查看错误。

## 验证

- 修改前验证当前 BAT 在端口被占用时不会主动清理监听进程。
- 运行 `start-opendrama-dev.bat --check`，确认环境初始化及前置检查成功。
- 用临时监听进程占用 `3000` 和 `3010`，通过实际启动 BAT 确认旧 PID 被结束。
- 确认新服务监听 `3000` 和 `3010`，访问 `http://localhost:3000` 与 `http://localhost:3010/admin/queues` 获得 HTTP 响应。
