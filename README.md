# 韩语阅读自学工作台

这是一个可部署到 GitHub Pages 或 Render Web Service 的网页项目。

## 需要上传的文件

- `index.html`
- `assets/`
- `.nojekyll`

## GitHub Pages 发布步骤

1. 在 GitHub 新建一个公开仓库，例如 `korean-reading-workbench`。
2. 上传本文件夹里的全部内容，确保 `index.html` 位于仓库根目录。
3. 打开仓库 `Settings`。
4. 进入 `Pages`。
5. 在 `Build and deployment` 中选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. 保存后等待 1-3 分钟。
7. 页面地址通常是：

```text
https://你的GitHub用户名.github.io/仓库名/
```

例如：

```text
https://gloria.github.io/korean-reading-workbench/
```

## 注意

- 本项目不需要服务器，也不需要安装依赖。
- 学习进度保存在访问者自己的浏览器 localStorage 中，不会同步到 GitHub。
- 音频文件已包含在 `assets/audio/` 中，上传后可以在线播放。

## Render Web Service 发布步骤

如果需要设置访问控制，推荐用 Render Web Service，而不是 GitHub Pages。

1. 把本文件夹里的全部内容上传到 GitHub 仓库。
2. 打开 Render，选择 `New` -> `Web Service`。
3. 连接刚才的 GitHub 仓库。
4. 设置：
   - Runtime: `Node`
   - Build Command: 留空或填写 `npm install`
   - Start Command: `npm start`
5. 在 `Environment Variables` 中添加登录配置。
6. 创建服务并等待部署完成。
7. Render 会生成一个类似下面的访问链接：

```text
https://你的服务名.onrender.com
```

## 方案一：Supabase 邮箱登录

这是推荐方案，适合人数较多、希望用户自行注册和登录的情况。

### Supabase 设置

1. 打开 Supabase，新建项目。
2. 进入 `Authentication` -> `Providers`，确认 `Email` 已启用。
3. 进入 `Project Settings` -> `API`，复制：
   - `Project URL`
   - `anon public` key
4. 回到 Render 的 `Environment Variables`，添加：

```text
SUPABASE_URL=你的 Supabase Project URL
SUPABASE_ANON_KEY=你的 Supabase anon public key
ALLOW_SIGNUP=true
```

如果你不想让用户自行注册，只允许已经在 Supabase 后台创建的用户登录：

```text
ALLOW_SIGNUP=false
```

### 用户使用方式

用户访问 Render 链接后，会先进入邮箱登录页：

```text
邮箱
密码
登录 / 注册新账号
```

注册后如果 Supabase 要求邮箱确认，用户需要先去邮箱点确认链接，再回来登录。

## 方案二：简单用户名密码

## 多人独立账号

如果不使用 Supabase，也可以继续用简单账号表。每个人都有自己的用户名和密码，设置一个环境变量：

```text
ACCESS_USERS
```

推荐填写 JSON 格式：

```json
[
  {"user":"student01","password":"pass001"},
  {"user":"student02","password":"pass002"},
  {"user":"student03","password":"pass003"}
]
```

Render 中填写时：

```text
Key: ACCESS_USERS
Value: [{"user":"student01","password":"pass001"},{"user":"student02","password":"pass002"},{"user":"student03","password":"pass003"}]
```

也可以用简写格式：

```text
student01:pass001,student02:pass002,student03:pass003
```

如果同时设置了 `ACCESS_USERS` 和 `ACCESS_USER` / `ACCESS_PASSWORD`，系统会优先使用 `ACCESS_USERS`。

注意：如果设置了 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`，系统会优先使用 Supabase 邮箱登录。
