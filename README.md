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

如果需要设置访问密码，推荐用 Render Web Service，而不是 GitHub Pages。

1. 把本文件夹里的全部内容上传到 GitHub 仓库。
2. 打开 Render，选择 `New` -> `Web Service`。
3. 连接刚才的 GitHub 仓库。
4. 设置：
   - Runtime: `Node`
   - Build Command: 留空或填写 `npm install`
   - Start Command: `npm start`
5. 在 `Environment Variables` 中添加：
   - `ACCESS_USER`: 访问用户名，例如 `gloria`
   - `ACCESS_PASSWORD`: 访问密码，例如你自己设定的一串密码
6. 创建服务并等待部署完成。
7. Render 会生成一个类似下面的访问链接：

```text
https://你的服务名.onrender.com
```

## Render 密码说明

- 如果没有设置 `ACCESS_PASSWORD`，网页会直接打开。
- 设置 `ACCESS_PASSWORD` 后，访问网页时浏览器会弹出用户名和密码输入框。
- 密码不要写在网页前端，也不要提交到 GitHub；只放在 Render 的环境变量里。
