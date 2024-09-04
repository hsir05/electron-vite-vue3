

## Quick Setup

```sh
# clone the project


# enter the project directory
cd electron-vite-vue

# install dependency
npm install

# develop
npm run dev
```

## Debug


## Directory

```diff
+ ├─┬ electron
+ │ ├─┬ main
+ │ │ └── index.ts    entry of Electron-Main
+ │ └─┬ preload
+ │   └── index.ts    entry of Preload-Scripts
+ ├─┬ src
+ │ └── main.ts       entry of Electron-Renderer
+ ├── index.html
+ ├── package.json
+ └── vite.config.ts
```

## 制作icon

### 1. 安装插件
```
npm install electron-icon-builder --save-dev
```

### 2. 配置package.json
```
 "scripts": {
    "electron:generate-icons": "electron-icon-builder --input=./public/electron.png --output=build --flatten"
  },
```

### 3. 执行
```
npm run electron:generate-icons
```
