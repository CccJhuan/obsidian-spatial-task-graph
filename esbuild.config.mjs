import esbuild from "esbuild";
import process from "process";

// 判断是否为生产环境
const prod = (process.argv[2] === "production");

// 手动定义 Node.js 内置模块列表，彻底解决兼容性报错
const builtins = [
    "child_process", "crypto", "events", "fs", "http", "https", "net",
    "os", "path", "querystring", "readline", "stream", "string_decoder",
    "url", "util", "zlib"
];

const context = await esbuild.context({
    banner: {
        js: '/* eslint-disable */',
    },
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins // 使用手动定义的列表
    ],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
    jsx: "automatic",
});

if (prod) {
    await context.rebuild();
    console.log("✅ 生产环境构建完成！main.js 已更新。");
    process.exit(0);
} else {
    await context.watch();
    console.log("👀 开发模式已启动：正在监听文件修改...");
}