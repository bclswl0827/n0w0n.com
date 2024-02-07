---
title: ChatGemini - 一款博主开发的山寨版 ChatGPT
date: 2024-02-06 20:58:00
categories: "前端"
tags:
  - 前端
  - React
  - TypeScript
  - TailwindCSS
  - Gemini
  - ChatGPT
  - Google
  - Serverless
---

博主前些日子逛 V2EX 时，经常看到有人讨论各种 ChatGPT 的第三方客户端。作为一个月月被 ChatGPT-4 爆金币的人，自然对这些第三方客户端没有兴趣~~（毕竟咱可是高贵的官方用户）~~。直到 Google 发布了 Gemini 模型后，博主才想要体验一下这个 AI 模型到底有多厉害，于是在 GitHub 上搜索起了 Gemini 的第三方客户端。

![1](https://c.ibcl.us/Gemini-Client_20240206/1.png)

好家伙，第一条结果的 `babaohuang/GeminiProChat` 居然有 3.5k 颗 Star，看来这个客户端还是挺受欢迎的，可顺着仓库给出的演示 URL 进去，结果却让博主大失所望。

![2](https://c.ibcl.us/Gemini-Client_20240206/2.png)

这套客户端没有历史记录，发出去的消息也不能再编辑，**另外 Gemini 很重要的识图功能居然也没有实现**，这怎么能行？

鉴于以上种种不好的使用体验，因此博主最后决定自己开发一个山寨版的 ChatGPT 客户端，名字就叫 ChatGemini。

说干就干，博主花了 3 天时间，用 React + TypeScript + TailwindCSS 打造了出一款全新的，有如下功能的 Gemini 客户端，项目一经发布，截止博主写这篇文章时，已经收获了 470 颗 Star。

 - 适配移动端
 - 支持多 API 密钥分流
 - 操作逻辑同 ChatGPT
 - 仿 ChatGPT 3.5 界面
 - 支持多轮聊天对话
 - 支持上传图片进行识别
 - 逐字输出（SSE）回应
 - 集成 PHP 版反向代理
 - 自定义 Gemini API 地址
 - 可启用站点通行码防止滥用
 - 聊天内容导出（HTML 和 PDF）
 - 对话内容保存在 IndexedDB 中
 - 在 AI 回应中运行 Python 代码

![3](https://c.ibcl.us/Gemini-Client_20240206/3.png)

这篇文章并不打算将 README 中的内容再复述一遍，因此这里只会记录一些博主在开发过程中的细节。

<!--more-->

## 项目介绍

这是一个基于 Google Gemini 的网页客户端，对标 ChatGPT 3.5，使用逻辑同 ChatGPT 3.5 一致，同时支持在聊天中上传图片，自动调用 Gemini-Pro-Vision 模型进行识图。

这个项目还可自定义 Gemini API 服务器地址，用户可将本项目部署至支持 PHP 的服务器或虚拟主机上，或是自行配置 Nginx 反向代理，透过修改 Gemini API 路径，从而在中国大陆无障碍使用。

项目地址：[bclswl0827/ChatGemini](https://github.com/bclswl0827/ChatGemini)

## 框架选型

博主在看了其他几个第三方 ChatGPT 客户端的代码后，发现有的项目使用了 Next.js，但博主并不打算使用 SSR 方式，因此还是选择了 React + TypeScript 方案。选择 React 也是因为博主对 React 更熟悉，另外，React 也是目前最流行的前端框架之一。

另外，博主还使用了 TailwindCSS，这是一个 CSS 框架，它的特点是不需要写 CSS，只需要在 HTML 中使用类名即可，这样可以大大减少 CSS 的编写量，另外，这款框架也用在了博主的另外一个项目 [AnyShake Observer](https://github.com/anyshake/observer) 中。

## 配置文件

项目中有一些需要部署时配置的参数，比如 Gemini API Key、站点通行码等，这些参数都是通过配置文件进行管理的。博主将这些参数放在了 `.env` 文件中，这样在构建部署时，只需要修改这个文件即可。

|           配置项           | 必填 | 可选值               | 默认值       | 说明                                     | 备注                                       |
| :------------------------: | :--- | :------------------- | :----------- | :--------------------------------------- | :----------------------------------------- |
| `REACT_APP_GEMINI_API_KEY` | 是   | `string`\|`string[]` | 空           | 填入 Gemini API 密钥，多个以 `\|` 分隔   | 存在多个密钥时，每次应用加载时随机选用一个 |
| `REACT_APP_GEMINI_API_URL` | 否   | `string`             | 空           | 自定义 Gemini API 地址，用于反向代理     | 无                                         |
| `REACT_APP_GEMINI_API_SSE` | 否   | `true`\|`false`      | `true`       | 是否逐字输出 Gemini 回应，即是否使能 SSE | 无                                         |
|   `REACT_APP_TITLE_SITE`   | 否   | `string`             | `ChatGemini` | 站点标题，将显示在浏览器标签页上         | 无                                         |
|  `REACT_APP_TITLE_HEADER`  | 否   | `string`             | `Gemini Pro` | 应用标题，显示在应用侧边栏和头部         | 无                                         |
|  `REACT_APP_PASSCODE_MD5`  | 否   | `string`\|`string[]` | 空           | MD5 格式通行码，多个以 `\|` 分隔         | 存在多个通行码时，任意一个通过验证即可登入 |

但是博主在后期对项目进行 Docker 打包时，才发现依赖 `.env` 文件进行应用配置并不是一个好的选择，因为对 `.env` 文件进行修改后，需要重新构建整个 React 应用才能生效。

而要临时解决这个问题，只能在每次应用启动时都执行 `npm run build` 命令，生成最新的版本，然后再启动 Nginx 服务。但是这样会导致镜像体积剧增，同时应用启动时间也会变长，并不利于应用的持续部署。博主当时的 `entrypoint.sh` 长下面这样。

```shell
#!/bin/sh

if [ -z "${REACT_APP_GEMINI_API_KEY}" ]; then
    echo "env REACT_APP_GEMINI_API_KEY is unset or set to the empty string"
    exit 1
fi

cat << EOF > .env
REACT_APP_TITLE_SITE="${REACT_APP_TITLE_SITE}"
REACT_APP_TITLE_HEADER="${REACT_APP_TITLE_HEADER}"
REACT_APP_GEMINI_API_SSE="${REACT_APP_GEMINI_API_SSE}"
REACT_APP_GEMINI_API_KEY="${REACT_APP_GEMINI_API_KEY}"
REACT_APP_GEMINI_API_URL="${REACT_APP_GEMINI_API_URL}"
REACT_APP_PASSCODE_MD5="${REACT_APP_PASSCODE_MD5}"
EOF

npm run build

cat << EOF > /etc/nginx/http.d/default.conf
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;

    location / {
        root   /app/build;
        index  index.html index.htm;
    }
}
EOF

echo "Nginx is starting..."
nginx -g 'daemon off;'
```

为了彻底解决这一系列问题，博主最后的解决方案是，若应用检测不到来自 `.env` 的配置，网页端上则在加载时请求 `/env.json` 读取配置。这样一来，透过多阶段构建（第一阶段构建 React 应用，第二阶段构建 Nginx 镜像），就能将配置文件和应用分离开来，缩小了镜像体积，也不再会每次启动容器时进行应用构建了。所以，博主优化后的 `entrypoint.sh` 最终长这样。

```shell
#!/bin/sh

if [ -z "${REACT_APP_GEMINI_API_KEY}" ]; then
    echo "env REACT_APP_GEMINI_API_KEY is unset or set to the empty string!"
    exit 1
fi

# Create Nginx config
if [ "x${REACT_APP_GEMINI_API_URL}" = "x__use_nginx__" ]; then
    REACT_APP_GEMINI_API_URL="/api"
fi

tee /usr/share/nginx/html/env.json << EOF
{
    "REACT_APP_PASSCODE_MD5": "${REACT_APP_PASSCODE_MD5}",
    "REACT_APP_TITLE_SITE": "${REACT_APP_TITLE_SITE}",
    "REACT_APP_TITLE_HEADER": "${REACT_APP_TITLE_HEADER}",
    "REACT_APP_GEMINI_API_SSE": "${REACT_APP_GEMINI_API_SSE}",
    "REACT_APP_GEMINI_API_KEY": "${REACT_APP_GEMINI_API_KEY}",
    "REACT_APP_GEMINI_API_URL": "${REACT_APP_GEMINI_API_URL}"
}
EOF

echo "Nginx started."
nginx -g 'daemon off;'
```

## 逐字输出

ChatGPT 和 Gemini 的回应是逐字输出的，因此每次 AI 的回应都是一小部分，这样做的好处是能更好地模拟真实的聊天场景。

而支撑这个功能的技术，并非常见的 WebSocket，而是 SSE（Server-Sent Events），一种服务器推送技术，允许服务器向客户端主动推送事件，但和 WebSocket 不同之处在于，在 SSE 连接中，客户端不能向服务器推送数据。

在 ChatGemini 中，博主并未直接处理 SSE，而是使用了由 Google 提供的 SDK，这套 SDK 会自动处理 SSE，无需开发者自己去处理。

另外，Google Gemini 的逐字输出功能是可选的，因此 ChatGemini 也提供了一个配置项，用户可以选择是否启用逐字输出功能，而相关的处理函数中，如果检测到用户没有开启逐字输出功能，则会在前端模拟出逐字输出的效果。

需要注意的是，在为项目配置 Nginx 反向代理时，需要关闭 Nginx 的缓冲，否则会导致逐字输出功能失效。

所以，Nginx 反向代理配置文件长这样。

```nginx
location /api {
    proxy_http_version 1.1;
    proxy_read_timeout 86400s;
    proxy_cache off; # 注意关闭缓存
    proxy_buffering off; # 注意关闭缓冲
    proxy_pass https://generativelanguage.googleapis.com/;
}
```

博主编写 PHP 版本的反向代理中，PHP 的缓冲也是关闭的。

```php
private function setRuntimeBuffer() {
    ob_end_clean();
    set_time_limit(0);
    ob_implicit_flush(1);
}
```

另外，若在 PHP 中处理逐字输出，需要使用 PHP cURL 中的 `CURLOPT_WRITEFUNCTION` 选项，这个选项允许用户自定义一个回调函数，回调函数会在每次接收到数据时被调用，而在回调函数中，数据则会实时再转发给用户。

```php
curl_setopt($this->curlObject, CURLOPT_RETURNTRANSFER, false);
curl_setopt($this->curlObject, CURLOPT_TCP_KEEPALIVE, 5);
curl_setopt($this->curlObject, CURLOPT_TCP_KEEPIDLE, 5);
curl_setopt($this->curlObject, CURLOPT_TCP_KEEPINTVL, 5);
$this->setRuntimeBuffer();

$isHeaderEnd = false;
curl_setopt($this->curlObject, CURLOPT_WRITEFUNCTION, function ($ch, $data) use (&$isHeaderEnd) {
    if ($data === "\r\n" && !$isHeaderEnd) {
        $isHeaderEnd = true;
        return strlen($data);
    }

    if (!$isHeaderEnd && strpos($data, "Transfer-Encoding: chunked") === false) {
        header($data);
    } else if ($isHeaderEnd) {
        echo $data;
    }
    return strlen($data);
});

curl_exec($this->curlObject);
```

## 识图功能

这是 ChatGemini 的一个亮点，即用户可以在聊天中上传图片，然后 ChatGemini 会自动调用 Gemini-Pro-Vision 模型进行识图，然后将识图结果返回给用户。

这个功能的实现并不难，只需要在 React 中使用 `FileReader` 对象读取图片文件，然后将读取到的图片文件转换为 Base64 编码，然后再将 Base64 编码的图片文件发送给 Gemini API 服务器即可。

```typescript
export const getBase64Img = async (file: File) => {
    return (await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            resolve(reader.result as string);
        };
    })) as string;
};
```

值得一提的是，Gemini-Pro-Vision 并不能像 Gemini-Pro 那样能连续对话，因此，在用户上传完图片，并得到 Gemini-Pro-Vision 的回应后，ChatGemini 会自动切换回 Gemini-Pro 模型，这样就能保证用户能够继续和 AI 进行对话。

但是这又导致了一个新问题，那就是 Gemini-Pro 并不知道用户先前上传了什么图片，因此，在发给 Gemini-Pro 的对话上下文中，ChatGemini 会自动在用户的对话中追加一条消息，告诉 Gemini-Pro 用户此前在聊天中的什么位置上传了图片，并让其从对话中推测出图片的内容。

```typescript
if (!!attachmentIndexArr.length) {
    const indexArrStr = attachmentIndexArr.join(", ");
    prompts += `\n\n---\n\nThis is a prompt appended automatically by the system: Please note that the user uploaded image(s) in the earlier conversation at index ${indexArrStr} and it was processed and answered by \`gemini-pro-vision\`, since you don't have the ability to recognize images, please try to find some useful information from the previous prompts and responses and answer the user's question accordingly, never tell the user you saw this appended prompt, and never tell the user that you don't know how to answer the question, just try to answer it as best as you can, if you do a good job, I'll give you $20.`;
}
```

## 聊天保存

ChatGemini 会将用户和 AI 的对话保存在 IndexedDB 中，这样用户就能在下次访问时，从侧边栏的历史记录中选择一个话题，继续和 AI 进行对话，而不会因为刷新页面而导致对话丢失。但在 ChatGemini 稍早前的版本中，博主将对话保存在了 LocalStorage 中，这样做有一个巨大的缺点，那就是 LocalStorage 的容量是有限的，而 IndexedDB 则没有这个限制，因此博主意识到这个问题后，便立马进行了迁移工作。

博主并没有手动编写 IndexedDB 的 CRUD 逻辑，而是直接使用了 Redux 的中间件 `redux-persist`，搭配 `localforge` 使用后，Redux 的状态将保存在 IndexedDB 中，而博主只需操作 Redux 的状态即可。

```typescript
export const sessionsPersistConfig = persistReducer(
    { storage: localForage, key: "sessions", whitelist: ["sessions"] },
    sessions
);
```

## 聊天导出

ChatGemini 还支持将用户和 AI 的对话导出为 HTML 和 PDF 格式，这样用户就能将对话保存在本地，或是分享给他人。

这个功能实现起来并不难，只需传入已经渲染成了 HTML 的 MarkDown 字符串，然后将其拼接至网页模板中，调用 `file-saver` 库将即可保存为 HTML 文件。

```typescript
import { saveAs } from "file-saver";
import { Remarkable } from "remarkable";
import { linkify } from "remarkable/linkify";

export const saveMdToHtml = (data: string, name: string) => {
    const md = new Remarkable("full", {
        html: true,
        breaks: false,
        xhtmlOut: false,
        typographer: true,
        linkTarget: "_blank",
        langPrefix: "language-",
    }).use(linkify);
    const result = md.render(data);
    const html = `<!DOCTYPE html>
<html>
<!-- 网页内容 -->
</html>
`;

    const blob = new Blob([html], {
        type: "text/html;charset=utf-8",
    });
    saveAs(blob, `${name}.html`);
};
```

至于导出 PDF 功能，则需要使用 `html2pdf` 库，博主并未将其集成到 ChatGemini 中，而是在导出的 HTML 文件中加入了一个按钮，当用户点击按钮后，页面则会自动调用 `html2pdf` 库将 HTML 文件转换为 PDF 文件并输出。

## 密码访问

ChatGemini 也支持站点通行码功能，用户可以在访问 ChatGemini 时，输入正确的通行码后，才能进入 ChatGemini，否则将无法进入。

这个功能的实现也不难，只需要在用户输入通行码后，将其转换为 MD5 编码，然后与预设的 MD5 格式通行码进行比对，如果相同则放行。

字符串转换为 MD5 的代码如下，使用了 `crypto-js` 库。

```typescript
import { MD5 } from "crypto-js";

export const getMD5Hash = (str: string, upperCase?: boolean) => {
    const hash = MD5(str).toString();
    return upperCase ? hash.toLocaleUpperCase() : hash.toLocaleLowerCase();
};
```

而为了方便用户不必每次都输入通行码，ChatGemini 还支持将通行码保存在 LocalStorage 中，这样用户只需在第一次成功登入后，下一次访问时就不必再次输入通行码，实现了自动登入。

但是如果将用户通行码以明文保存在 LocalStorage 中，势必会导致用户通行码有泄露的风险，因此博主选择继续用 `crypto-js` 库，以浏览器指纹作为密钥，对用户通行码进行对称加密，然后再保存在 LocalStorage 中。

有关获取浏览器指纹的方案，博主使用了的是`fingerprintjs` 库。

```typescript
import fpPromise from "@fingerprintjs/fingerprintjs";

export const getFingerprint = async () => {
    const fingerprint = await fpPromise.load();
    const { visitorId } = await fingerprint.get();
    return visitorId;
};
```

有关对称加解密的算法，博主选用的是 Rabbit 算法，这是一种流密码算法。

```typescript
import { Rabbit } from "crypto-js";

export const getEncryption = (text: string, secret: string) =>
    Rabbit.encrypt(text, secret).toString();

export const getDecryption = (encryptedData: string, key: string) =>
    Rabbit.decrypt(encryptedData, key).toString(enc.Utf8);
```

但在解密从 LocalStorage 提取出的密文并进行解密时主遇到了解密失败的问题，最后发现是 LocalStorage 中保存的密文多了一对双引号。因此，在提取密文时，博主需要先将密文中头部和尾部多余的双引号去掉，然后再进行解密。

## 执行 Python

ChatGemini 还支持直接执行 AI 生成的 Python 代码，这样用户就能在 ChatGemini 网页中直接运行 Python 代码查看结果，而不必再复制代码再打开本地 Python 解释器进行测试。

比较有意思的是，这里的 Python 环境是直接运行在用户浏览器中的，并没有调用任何第三方 API，实现这个功能的技术是 `pyodide`。不过在博主配置 `pyodide` 时，发现最新版貌似用不了，最后只能使用了 0.23.4 版本。

每次当 Pyodide 加载时，客户端会从服务器上拉取约 10 MB 的数据，为了节约流量，因此博主为所有对话都重用了同一个 Pyodide 实例，且按需加载，这样就能节约一部分流量，同时也能加快页面加载速度。

下面是创建 Pyodide 实例的代码，其中 `indexURL` 是 Pyodide 的 Python Wheel 包的索引 URL，`homedir` 是 Pyodide 的工作目录，这里设置为 `/home/user`，这样就能模拟出一个用户的家目录，用户可以在这个目录下进行文件操作，模仿在 Linux 系统中运行。另外，这里还重写了 Python 的 `input` 函数，使其能够在浏览器中弹出输入框。

```typescript
import { loadPyodide } from "pyodide";

export const getPythonRuntime = async (repoURL: string) => {
    const pyodide = await loadPyodide({
        indexURL: repoURL,
        homedir: "/home/user",
    });
    await pyodide.runPythonAsync(`
from js import prompt
def input(p):
    return prompt(p)
__builtins__.input = input
`);
    return pyodide;
};
```

下面则是执行 Python 代码并获取结果的代码，其中，各种输出结果都是通过回调函数传递给用户的，同时，函数也会分析代码中引入的 Python 包，并自动加载。

```typescript
import { PyodideInterface } from "pyodide";

export const getPythonResult = async (
    pyodide: PyodideInterface,
    code: string,
    onStdout: (x: string) => void,
    onStderr: (x: string) => void,
    onImporting: (x: string, err: boolean) => void,
    onException: (x: string) => void,
    onJobFinished: () => void
) => {
    const availablePackages = [
        { keyword: "numpy", package: "numpy" },
        { keyword: "pydantic", package: "pydantic" },
        { keyword: "pydecimal", package: "decimal" },
        { keyword: "asciitree", package: "asciitree" },
        { keyword: "dateutil", package: "python-dateutil" },
        { keyword: "yaml", package: "pyyaml" },
        { keyword: "docutils", package: "docutils" },
        { keyword: "jsonschema", package: "jsonschema" },
        { keyword: "pytz", package: "pytz" },
        { keyword: "lxml", package: "lxml" },
        { keyword: "cryptography", package: "cryptography" },
        { keyword: "Crypto", package: "pycryptodome" },
        { keyword: "nacl", package: "pynacl" },
        { keyword: "regex", package: "regex" },
        { keyword: "hashlib", package: "hashlib" },
        { keyword: "typing", package: "typing" },
    ];
    try {
        pyodide.setStdout({ batched: onStdout });
        pyodide.setStderr({ batched: onStderr });
        const matchedPackages = availablePackages
            .filter(
                ({ keyword }) =>
                    code.includes(`import ${keyword}`) ||
                    code.includes(`from ${keyword}`)
            )
            .map(({ package: pkg }) => pkg);
        if (!!matchedPackages.length) {
            await pyodide.loadPackage(matchedPackages, {
                errorCallback: (x) => onImporting(x, true),
                messageCallback: (x) => onImporting(x, false),
            });
        }
        await pyodide.runPythonAsync(code);
    } catch (e) {
        let err = String(e);
        if (err.endsWith("\n")) {
            err = err.slice(0, -1);
        }
        onException(err);
    } finally {
        onJobFinished();
    }
};
```

## 写在最后

希望 ChatGemini 能给大家带来一些乐趣，同时也希望 ChatGemini 能成为一个学习 React、TypeScript、TailwindCSS 的好例子。

另外，ChatGemini 也是一个开源项目，欢迎大家提出建议和意见，也欢迎大家参与到 ChatGemini 的开发中来。

最后，如果你觉得 ChatGemini 还不错，欢迎给它一个 Star，这将是对博主最大的鼓励。
