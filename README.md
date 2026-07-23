# 安排网页版

移动优先的附近去处推荐网页。打开后自动定位，直接展示 1 个主推荐和 2 个备选。

## 地点数据

- 主数据源：高德地图 JavaScript API 2.0，提供真实 POI、地点图片、评分和人均信息。
- 降级数据源：公开地图，仅在高德未配置或临时失败时使用。
- 大众点评：只在详情页作为外部评价/店图入口，不抓取或冒充点评数据。

在 `amap-config.js` 中填写同一个“Web端（JS API）”Key 对应的 Key 和安全密钥，并在高德控制台把域名白名单限制为：

```text
qinyushen1021.github.io
```

## 本地运行

```bash
npm install
npm run dev
npm run build
```

生产产物位于 `dist/`。项目也保留了可直接由 GitHub Pages 从仓库根目录发布的静态入口。
