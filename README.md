# 韩语阅读自学工作台

这是一个可直接部署到 GitHub Pages 的静态网页项目。

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
