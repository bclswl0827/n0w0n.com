---
title: 我写了一个无需后端的短网址程序...
date: 2023-06-26 01:07:10
categories: "前端"
tags:
  - 前端
  - React
  - TypeScript
  - Firebase
  - 实时数据库
  - NoSQL
  - Serverless
---

了解博主的人都知道，博主曾经也是个长期混迹 HostLoc 的元老级 MJJ，即便天天被各种事情忙得抽不开身，还是会花出大量时间浏览各种 VPS 和域名相关的资讯。在那段疯狂的岁月里，博主也攒下了不少垃圾域名。

不幸的是，与其他 MJJ 一样，这些域名买下来之后，基本也没怎么用过，顶多也就挂挂探针，再无其他的用途。直到某日，博主在给别人发一个长链接时，突然想到，能不能把自己的域名利用起来，搭建一个短网址服务呢？

博主在调研了市场的大多数短网址程序过后，发现大多数短网址程序都是使用 PHP 实现的，并需要对接到 MySQL、PostgreSQL、SQLite 等数据库，当用户请求事前生成好的短网址时，该请求会发送到后端服务器，而后端程序会先从数据库检索到其对应到的长网址，再将长网址附在 301 或者 302 的响应中，实现跳转。

但是博主却对这些要使用后端的短网址程序都不太满意，因为在实际的部署和运营中，服务器除了要处理正常的访客流量，还需要处理来自机器人的大量疯狂试探（毕竟暴露在公网的服务本身就不安全），而且后端程序部署在自己服务器上，万一程序自身出了什么 0Day 漏洞，却又正好被利用的话，那么服务器就彻底沦为别人的肉鸡了。

再者，由于博主的服务器大多都是低配小鸡，随手一个 CC 攻击就能轻松拿捏博主，本着多一事不如少一事的原则，博主最终决定开发一套不依赖自建后端及数据库的短网址程序，再将前端部署于 GitHub Pages，只使用 JavaScript 做页面间的跳转，这样就能实现抵御大部分攻击和试探了。

<!-- more -->

# 数据库选型

市面上已经有很多的 Serverless 云数据库服务了，例如 Google 的 Firebase 就提供了 Firebase Realtime Database，而本文提到的短网址程序正是基于 Firebase 平台。

使用 Firebase 不需要绑定信用卡，创建的项目默认为免费版本（Spark 方案），自然也就不存在超出帐单自动扣费的问题，另外，免费版本的 Realtime Database 存储配额为 1 GB，若按照一条短网址占用 4 kB 空间来计算，容纳 25.6 万条短网址已经绰绰有余。

![Spark 方案](https://c.ibcl.us/ShortLink-Firebase_20230626/1.png)

在 Firebase Realtime Database 中对数据增删查改数据也非常方便。由于这个项目不需要对用户进行鉴权（即用户可以不登入帐号创建短网址），所以也没有必要用到 Firebase SDK，直接使用 JavaScript 中提供的 `XMLHttpRequest` 或是 `fetch` 请求数据库 API 即可实现。

在 Firebase 的官方文档中，已经给出 [Firebase Realtime Database](https://firebase.google.com/docs/reference/rest/database?hl=en) 增删查改数据的调用方法。

# 制定数据结构

Firebase Realtime Database 中的所有数据都是以 JSON 对象来保存的，数据库 API 地址以 `https://test.firebaseio.com` 为例（读写权限已全部打开的情况下），下面是一个示例结构。

```json
{
    "users": {
        "joshua": {
            "age": 18,
            "gender": 1,
            "nation": "US"
        }, 
        "mary": {
            "age": 16,
            "gender": 0,
            "nation": "GB"
        }
    }
}
```

在这份表中，若要取得所有用户的资讯（位于 `users` 字段），那么使用 `curl` 工具的请求体如下。

```shell
curl -X GET https://test.firebaseio.com/users.json
{"joshua":{"age":18,"gender":1,"nation":"US"},"mary":{"age":16,"gender":0,"nation":"GB"}}
```

又例如，若要取得用户 `joshua` 的资讯，那么使用 `curl` 工具的请求体如下。

```shell
curl -X GET https://test.firebaseio.com/users/joshua.json
{"age":18,"gender":1,"nation":"US"}
```

有了以上背景做铺垫，那么就可以开始制定短网址服务的数据结构了。经过分析，一份用户提交的短网址记录中，至少应该包含如下内容。

 - 短网址的路径
 - 原始的长网址

而通常情况下，出于其他一些考虑（例如为之后编写后台管理面板做准备，提高用户使用体验），还应当记录一些其他的内容。

 - 短网址生成时间
 - 生成者留下的备注

同时，为了提高服务的安全性（打击侵权内容、血腥暴恐、儿童色情等），还应当对提交链接的访客身份做一些记录。

 - 生成者之 IP
 - 生成者所在国家
 - 生成者浏览器 UA

所以，最终的表结构应该如下所示。

```json
{
    "shorts": {
        "abcd": {
            "remark": "链接生成者备注内容 - 1",
            "slug": "abcd",
            "timestamp": 1687537590892,
            "url": "https://google.com",
            "user": {
                "country": "US",
                "ip": "1.0.0.1",
                "ua": "Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0"
            }
        },
        "efgh": {
            "remark": "链接生成者备注内容 - 2",
            "slug": "efgh",
            "timestamp": 1687537718335,
            "url": "https://google.com.tw",
            "user": {
                "country": "US",
                "ip": "1.0.0.1",
                "ua": "Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0"
            }
        }
    }
}
```

上述表结构设计巧妙之处在于，将短网址的短链直接作为了表中的 key，例如，若要取得 `abcd` 这一短链接对应到的资讯，那么只需以 GET 方式请求 `https://test.firebaseio.com/shorts/abcd.json` 即可。

例如，用于短网址服务的域名是 `slnk.com`，**当用户访问 `slink.com/abcd` 时，前端 JavaScript 只需先将 `abcd` 的部分取出，然后拼接到 Firebase Realtime Database 的 API 请求路径中，即可完成取回链接资讯的操作**。

新增短链接方面，**当用户提交长链和自定义的短链后，先用和上述同样的方法判断短链是否已经存在，若 API 返回了正常数据，则提示用户短链接已经被占用；若 API 返回空数据则说明链接未被占用，可以继续**。

# 编写基本函数

博主的短网址项目使用的是 React + TypeScript，前端 CSS 框架则选用了原子化的 Tailwind。本文会放上的是项目中一些比较关键的代码。

## 封装请求函数

考虑到便利性，博主并没有直接使用 `XMLHttpRequest` 或是 `fetch` 对 Firebase Realtime Database 做请求，而是使用了 axios 这个库。

axios 支持使用拦截器对请求进行拦截，借助拦截器，可以方便地对请求做一些修改再重新送出，从而减少代码量，也提高了代码可读性。在这里，博主需要为所有请求加上 `Accept` 头，以指示 Firebase Realtime Database 响应 JSON 数据。

```typescript
import axios, { AxiosResponse, AxiosError } from "axios";

interface Params {
    method: "get" | "post" | "put" | "delete" | "patch";
    url: string;
    params?: any;
    data?: any;
    timeout?: number;
}

const userRequest = ({
    method,
    url,
    data,
    params,
    timeout = 10000,
}: Params): Promise<AxiosResponse> => {
    const _axios = axios.create({
        timeout: timeout,
    });

    _axios.interceptors.request.use((config: any) => {
        try {
            config.headers["Accept"] = "application/json";
            config.headers["Content-Type"] = "application/json";
        } catch (error) {
            return Promise.reject(error);
        }

        return config;
    });

    _axios.interceptors.response.use(
        (res: AxiosResponse) => {
            return res;
        },
        (err: AxiosError) => {
            return Promise.reject(err);
        }
    );

    return _axios.request({
        url: url,
        method: method,
        data: data,
        params: params,
    });
};

export default userRequest;
```

## 检查用户输入

俗话说，Never Trust User Input（永远不要相信用户输入），虽然这是个纯前端项目，但是这条规则同样适用，因为谁也猜不到「用户」能用什么清奇的方式，往数据库里注入什么奇怪的东西。

所以在这个项目中，前端部分需要对用户输入做以下约束。

 1. 原始链接须为 HTTP/HTTPS/FTP 协议之一
 2. 原始链接长度须小于等于 255 个字符
 3. 短网址不可存在特殊字符（如 *&^$ 等）
 4. 短网址长度须大于等于 4 且小于等于 10 个字符
 5. 用户备注长度须小于等于 100 个字符

上面的几个需求，主要依靠正则和 length 方法来实现，并不复杂。为了便于调用，博主自定义了一个 Error 类型的接口，用作三个函数的返回值（一看就知道是 Go 写多了）。

```typescript
interface Error {
    readonly error: boolean;
    readonly message: string;
}

const isURLValid = (url: string): Error => {
    const urlReg = /^((https|http|ftp)?:\/\/)[^\s]+/;
    const result = urlReg.test(url) && url.length <= 255;
    return {
        error: !result,
        message: !result
            ? "链接内容不合法，请检查内容是否以 http:// 或 https:// 开头，或长度是否超过 512 个字符"
            : "",
    };
};

const isSlugValid = (slug: string): Error => {
    const slugReg = /^[a-zA-Z0-9-_]+$/;
    const result =
        (slugReg.test(slug) && slug.length >= 4 && slug.length <= 10) ||
        slug.length === 0;
    return {
        error: !result,
        message: !result
            ? "短链不合法，请检查内容是否存在特殊字符，长度是否少于 4 个或超过 10 个字符"
            : "",
    };
};

const isRemarkValid = (remark: string): Error => {
    const result = remark.length <= 100;
    return {
        error: !result,
        message: !result ? "备注不合法，请缩短备注长度至 100 个字符以内" : "",
    };
};

export { isURLValid, isSlugValid, isRemarkValid };
```

这样就结束了吗？当然不是！写到这里，博主想起以前混 HostLoc 时，曾刷到一篇关于「如何透过 F12 开 Vultr 2.5 刀小鸡」的帖子，贴子中就是直接透过修改前端代码绕过的限制。

既然有这经验了，博主肯定不会再犯这种低级错误了，所以不光前端要限制用户输入，数据库一侧也要限制用户输入。

幸亏 Firebase Realtime Database 拥有比较强大的规则控制，所以在数据库端也能轻松约束用户输入的内容，从而避免用户对应用抓包后自行构造恶意请求。

![Firebase Realtime Database 规则管理](https://c.ibcl.us/ShortLink-Firebase_20230626/2.png)

博主也已经整理出了与上文所述前端规则相同的数据库规则，此外，这段规则还包含了对 `timestamp` 字段的校验，将用户与标准时间的误差控制在了 5 分钟之内。

```json
{
    "rules": {
        "shorts": {
            "$query": {
                "remark": {
                    ".read": true,
                    ".write": true,
                    ".validate": "newData.isString() && newData.val().length <= 100"
                },
                "slug": {
                    ".read": true,
                    ".write": true,
                    ".validate": "newData.isString() && newData.val().length >= 4 && newData.val().length <= 10 && newData.val().matches(/^[a-zA-Z0-9]+$/)"
                },
                "url": {
                    ".read": true,
                    ".write": true,
                    ".validate": "newData.isString() && newData.val().matches(/^(https|http|ftp):\\/\\//) && newData.val().length <= 255"
                },
                "timestamp": {
                    ".read": true,
                    ".write": true,
                    ".validate": "newData.isNumber() && now - newData.val() < 30000"
                },
                "user": {
                    "ua": {
                        ".read": true,
                        ".write": true,
                        ".validate": "newData.isString() && newData.val().length <= 255"
                    },
                    "country": {
                        ".read": true,
                        ".write": true,
                        ".validate": "newData.isString() && newData.val().length <= 96"
                    },
                    "ip": {
                        ".read": true,
                        ".write": true,
                        ".validate": "newData.isString() && (newData.val().matches(/^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$/) || newData.val().matches(/^([\\da-fA-F]{1,4}:){7}[\\da-fA-F]{1,4}$/))"
                    },
                    ".validate": "newData.hasChildren(['country', 'ip', 'ua'])"
                },
                ".read": true,
                ".write": true,
                ".indexOn": [
                    "timestamp"
                ],
                ".validate": "newData.hasChildren(['url','slug','timestamp','remark','user'])"
            },
            ".read": "auth != null",
            ".write": "auth != null"
        }
    }
}
```

## 取得用户资讯

这个项目仅收集用户的浏览器 UA、IP 位址和所在国家，以避免用户滥用以及用来分发侵权内容、血腥暴恐、儿童色情等。由于需要用到第三方的查询 API，为了避免单点故障，所以博主的方案是内建一系列同类 API，每次从第一个 API 询问起，到获得用户 IP 及国家为止。

```typescript
import userRequest from "./userRequest";

export interface Result {
    ua: string | "";
    country: string | "Unknown";
    ip: string | "0.0.0.0";
}

const getUserInfo = async (): Promise<Result> => {
    const ipAPIs = [
        "https://ipwho.is",
        "https://ipinfo.io/json",
        "https://ipapi.co/json",
        "https://ip.nf/me.json",
        "https://ip-api.io/json",
        "https://freeipapi.com/api/json",
        "https://api.wolfx.jp/geoip.php",
        "https://www.geoplugin.net/json.gp",
    ];

    const { userAgent } = navigator;
    for (let api of ipAPIs) {
        try {
            const res = await userRequest({
                url: api,
                method: "get",
            });

            const {
                // Possible keys for country
                country_name,
                countryName,
                country,
                geoplugin_countryName,
                // Possible keys for ip
                ip,
                query,
                ipAddress,
                geoplugin_request,
            } = res.data;
            return {
                ua: userAgent,
                country:
                    country ||
                    countryName ||
                    country_name ||
                    geoplugin_countryName,
                ip: ip || query || ipAddress || geoplugin_request,
            };
        } catch {
            continue;
        }
    }

    return {
        ua: userAgent,
        country: "Unknown",
        ip: "0.0.0.0",
    };
};

export default getUserInfo;
```

值得一提的是，这段的代码使用了异步编程的方法，可以有效避免陷入「回调地狱」。

## 数据库 CURD

其实前文也已经提到，对 Firebase Realtime Database 的增删查改操作，就是一堆 HTTP 请求，没有什么太大的难度，只需要做好相应的错误处理即可。

在这一部分的代码中，博主都是使用的异步编程方式。

### 增加短链

这里使用 PUT 方法，带上相应数据结构即可，由于已经对传入到数据库的值做了约束，所以前端提交的值也必须符合规范。

```typescript
import userRequest from "./userRequest";
import { Result as UserInfo } from "./getUserInfo";

interface Params {
    url: string;
    slug: string;
    remark: string;
    firebase: string;
    user: UserInfo | any;
}

const addShortLink = async ({
    url,
    slug,
    remark,
    firebase,
    user,
}: Params): Promise<string> => {
    const dbURL = `${firebase}/shorts/${slug}.json`;
    const res = await userRequest({
        method: "put",
        url: dbURL,
        data: {
            url: url,
            slug: slug,
            remark: remark,
            timestamp: Date.now(),
            user: user,
        },
    });

    if (res.status !== 200) {
        return Promise.reject("短链生成失败");
    }

    return slug;
};

export default addShortLink;
```

### 删除短链

删除短链使用 DELETE 方法，传入要删除的短链即可。不得不说 Google 的规范真的很优秀，完全是照着 RESTful 规范来的。

```typescript
import userRequest from "./userRequest";

interface Params {
    slug: string;
    firebase: string;
}

const removeShortLink = async ({ slug, firebase }: Params): Promise<string> => {
    const dbURL = `${firebase}/shorts/${slug}.json`;
    const res = await userRequest({
        method: "delete",
        url: dbURL,
    });

    if (res.status !== 200) {
        return Promise.reject("短链删除失败");
    }

    return slug;
};

export default removeShortLink;
```

### 查询短链

查询短链使用 GET 方法即可，同样是只需要传入要查询的短链。如果没有查询到相关数据，Firebase Realtime Database 则会返回 `Null`，根据这一区别抛出相关错误即可。

```typescript
import userRequest from "./userRequest";
import { Result as UserInfo } from "./getUserInfo";

interface Params {
    slug: string;
    firebase: string;
}

interface Result {
    remark: string | "";
    url: string | "";
    slug: string | "";
    user: UserInfo;
    timestamp: number | -1;
}

const getShortLink = async ({ slug, firebase }: Params): Promise<Result> => {
    const dbURL = `${firebase}/shorts/${slug}.json`;

    const res = await userRequest({
        method: "get",
        url: dbURL,
    });
    if (res.data === null) {
        return Promise.reject("查无此短链");
    }

    const { remark, url, timestamp, user } = res.data;
    return {
        timestamp: timestamp,
        remark: remark,
        url: url,
        slug: slug,
        user: user,
    };
};

export default getShortLink;
```

### 修改短链

虽然项目用不到，但是博主还是写上了，这里用的是 PATCH 方法，只需要传入一组或多组待修改的字段即可。

```typescript
import userRequest from "./userRequest";
import { Result as UserInfo } from "./getUserInfo";

interface Params {
    slug: string;
    firebase: string;
}

interface Result {
    remark: string | "";
    url: string | "";
    slug: string | "";
    user: UserInfo;
    timestamp: number | -1;
}

const getShortLink = async ({ slug, firebase }: Params): Promise<Result> => {
    const dbURL = `${firebase}/shorts/${slug}.json`;

    const res = await userRequest({
        method: "get",
        url: dbURL,
    });
    if (res.data === null) {
        return Promise.reject("查无此短链");
    }

    const { remark, url, timestamp, user } = res.data;
    return {
        timestamp: timestamp,
        remark: remark,
        url: url,
        slug: slug,
        user: user,
    };
};

export default getShortLink;
```

# 完整项目仓库

项目完整代码已经开源到了 GitHub 上，名为 FireShort，使用 MIT 协议~~（毕竟博主向来是个很大方的人）~~。

链接在此 => [bclswl0827/FireShort: FireShort: 基于 Firebase 的 Serveless 纯前端短链接生成工具](https://github.com/bclswl0827/FireShort)

同时，博主也开放了一个演示站点 [lv9.us](https://lv9.us) 供体验。

![FireShort - 1](https://c.ibcl.us/ShortLink-Firebase_20230626/3.png)

![FireShort - 2](https://c.ibcl.us/ShortLink-Firebase_20230626/4.png)

# 一些奇技淫巧

程序写完过后，博主果断将生成的 dist 推送到了 GitHub Pages 上，准备好好欣赏自己的成果。

离谱的是，博主满心欢喜生成好短链接，去到另外一个窗口打开这个链接过后，看到的却是 404。

![FireShort - 3](https://c.ibcl.us/ShortLink-Firebase_20230626/4.png)

原来这是因为 React 的前端路由分为 Hash 和 History 两种模式。前者的路径形式行如 `example.org/#/test`，而后者的路径形式行如 `example.org/test`，这与传统的后端路由一样，因而导致在不支持 History 模式的服务器上就会产生 404 错误。

但是 Hash 模式真的很丑！难道好不容易生成了一个短网址，还得按着 Shift 再打出一组 `/#` 吗？

经过博主一天一夜的思考，最后灵光一闪：既然 GitHub Pages 能够支持自定义 404 页面，那么利用 404 页面来跳转去到 Hash 路由不就好了吗？

于是，就有了这样的一个 `404.html` 文件（源码路径位于 `public/404.html`）。

```html
<!DOCTYPE html>
<html lang="zh_CN">
    <head>
        <meta charset="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, user-scalable=no" />
        <meta name="description" content="快打开查看吧～" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        <title>给你分享了一个链接</title>
    </head>
    <body>
        <noscript>您需要使用支持 JavaSctipt 的浏览器才能正常加载本站</noscript>
        <script>
            (() => {
                const protocol = window.location.protocol;
                const host = window.location.host;
                const path = window.location.pathname;
                if (path !== "/404.html") {
                    window.location.href = `${protocol}//${host}/#${path}`;
                } else {
                    window.location.href = `${protocol}//${host}/`;
                }
            })();
        </script>
    </body>
</html>
```

这样一来，当访问 `/test` 之后，便会被自动带到 Hash 路由下的 `/#/test`，问题完美解决。

博主还煞费苦心地给这种方法取了个新名字，叫 `redirect` 模式（源码中 `src/config.tsx` 即可设定），真是辛苦博主了。

# 后记

这份代码其实是博主去年疫情期间打发时间写的，之后也没有再改过。这几天准备炒点冷饭，但是发现之前写的代码根本没法看，遂狠心花了一天时间，用 TypeScript 重构了一遍，终于舒服了。

哎，又了结了一桩心事！
