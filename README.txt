音频文件不放在仓库里，已放到 GitHub Release：
https://github.com/Gloria-create0506/korean-reading-github-pages/releases/tag/audio-v1

网页数据文件 assets/book-data.js 直接引用 Release 外链，例如：
https://github.com/Gloria-create0506/korean-reading-github-pages/releases/download/audio-v1/ch01-full.mp3

命名规则：
- ch01-full.mp3 = 第 1 章完整音频
- ch02-full.mp3 = 第 2 章完整音频
- ch30-full.mp3 = 第 30 章完整音频

上传到 GitHub 仓库时，不要上传 mp3，只上传 assets/book-data.js 和这个 README 即可。