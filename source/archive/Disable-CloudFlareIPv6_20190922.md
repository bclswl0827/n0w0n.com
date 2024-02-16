---
title: 曲线救国：利用 Cloudflare API 关闭 Cloudflare IPv6 兼容功能
date: 2019-09-22 11:22:00
categories: "杂谈"
tags:  [杂谈]
---

博主有幸用到中国移不动免费送的流量，但是却发现打开自己的博客所用时间再创 147s 的新高。

博主博客使用 Cloudflare 的 CDN 保护源站并~~加速~~，经过 nslookup 等一波操作后，博主发现原来是 Cloudflare 优先让浏览者使用了 IPv6 访问网站。

好吧，没有任何贬低 IPv6 的意思，老外们都说 IPv6 速度快，博主也相信这只是在国外而言...

以日本为例，这个亚洲 IPv6 普及度比较高的国家。

![IPv6 在日本](https://c.ibcl.us/Disable-CloudFlareIPv6_20190922/1.png "IPv6 在日本")

然而这玩意在中国却又变了味，就算连到百度的 IPv6 站，延迟都是 70+ms，丢包更不用说，80% Loss 绝对不是吹牛。工信部下令部署 IPv6，三大运营商也只是为了完成任务，之所以连通性这么低，也是因为利益相关。

在这么一个神奇的国度，IPv6 自然不合国情，所以要阉割掉。然而 Cloudflare 却不让用户直接关掉 IPv6 兼容功能，所以这是一个很恼火的问题。

<!--more-->

偶然注意到 Cloudflare 提供了 API，或许可以曲线救国，用 API 替我完成这项操作呢？

![API PATCH](https://c.ibcl.us/Disable-CloudFlareIPv6_20190922/2.png "API PATCH")

展开 API 的选项卡，记下用于 PATCH 请求的 API，然后转到 Cloudflare 的 My Profile，进入 API Tokens，在下方 API Keys 选项卡中的 Global API Key，点击 View，输入密码，验证 reCAPTCHA 后，得到全局 API Token，并记下。

![得到全局 API Token](https://c.ibcl.us/Disable-CloudFlareIPv6_20190922/3.png "得到全局 API Token")

接下来，打开 Linux 的终端，使用 cURL 命令关闭 IPv6 兼容功能。

```
yuki@meow:~$ curl -X PATCH "https://api.Cloudflare.com/client/v4/zones/用于 PATCH 请求的 API/settings/ipv6" \
     -H "X-Auth-Email: 注册时的邮箱地址" \
     -H "X-Auth-Key: 全局 API Token" \
     -H "Content-Type: application/json" \
     --data '{"value":"off"}'
```

不出意外，会得到类似这样的回显。

```
{"result":{"id":"ipv6","value":"off","modified_on":"2019-09-22T02:40:25.184464Z","editable":true},"success":true,"errors":[],"messages":[]}
```

回到 Dashboard，IPv6 的状态是 Off，说明成功关闭了。

![IPv6 已经关闭](https://c.ibcl.us/Disable-CloudFlareIPv6_20190922/4.png "IPv6 已经关闭")

于是现在域名会被自动解析到 IPv4 地址了。对于那些身在国内，又有双栈网络的人来说，或许访问速度也确实增加了不少。