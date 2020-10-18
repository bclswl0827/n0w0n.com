---
title: 在 ArukasCloud 搭建 V2Ray
date: 2019-02-08 23:22:00
categories: "杂谈"
tags:  [杂谈]
---
**重要：ArukasCloud 将于 2020 年 1 月 30 日停止运行，届时所有服务将停止。**

[**作为 Arukas 的替代，或许您可以参考博主在 Heroku 搭建 V2Ray 的教程。**](https://ibcl.us/Heroku-V2Ray_20191014/)

博主曾经注册了 Sakura 的免费容器服务 Arukas Cloud，但是后来由于滥用的人太多，导致所有免费实例分配到的地址都被和谐掉（TCP 阻断），此后便一直吃灰。

今天难得想起 Arukas，于是博主开始了新一轮折腾......

对了，好像很少在博客里面发这类东西呢。（

## 思路？

要补充的是，Arukas Cloud 会自动反代 80 端口，另外生成一个 Https 的 Endpoint（即，`https://example.arukascloud.io`），并且可以直接访问。这样的话，可操作性就很强了。

使用 V2Ray Websocket + Arukas Endpoint，由于 Endpoint 已经自带了 Https，所以现在连证书都可以懒得申请了～也就相当于 Websocket + TLS 了。

<!--more-->

## 开始！

镜像使用 Ubuntu 16.04：`rastasheep/ubuntu-sshd:16.04`

### 准备中...

在 Arukas 的实例管理页面中分别开启 80 和 22 两端口，然后部署。

![实例配置](https://cdn-image.ibcl.us/ArukasCloud-V2Ray_20190208/1.png "实例配置")

使用 SSH，填入分配到的地址，连接到实例，但由于免费版分配的带端口的地址无法正常连接，所以事先还需要挂梯子来连接。

先在 Session 填好服务器的地址和端口，再转至 Connection 的 Proxy 子项配置本地代理服务器，像这样：

![代理配置](https://cdn-image.ibcl.us/ArukasCloud-V2Ray_20190208/2.png "代理配置")

SSH 用户名，密码都是 root。

SSH 连上后，首先更新一波软件源：

```
root@1edc23sfk:~# apt update
```

由于免费版只提供 0.1v CPU 和 128MB RAM，所以慢得抠脚...... 正因如此，update 完了之后就不要再 upgrade 了，免得被 Kill 掉。

这玩意儿不兹瓷用 systemctl 来控制进程，而 init.d 又太落后，算了算了，用 screen 吧。

除了 screen 之外，一并安装接下来要用到的 unzip：

```
root@1edc23sfk:~# apt install screen unzip -y
```

准备工作完成。

### 正式折腾～

#### 折腾 V2Ray

```
root@1edc23sfk:~# arch
x86_64
```
查看架构，下载对应预编译版本。

```
root@1edc23sfk:~# mkdir v2ray
root@1edc23sfk:~# cd v2ray
root@1edc23sfk:~/v2ray# wget https://github.com/v2ray/v2ray-core/releases/download/v4.15.0/v2ray-linux-64.zip
root@1edc23sfk:~/v2ray# unzip v2ray-linux-64.zip
root@1edc23sfk:~/v2ray# rm -f config.json
root@1edc23sfk:~/v2ray# chmod +x v2ray v2ctl
```

反正是容器，随便瞎搞就是了，这里就在 `/root/v2ray` 里运行。

已经删除了默认的配置文件，接下来重新创建配置文件，由于系统没有 Vim，也懒得再装，所以直接用 `echo` 命令写入文件：

```
root@1edc23sfsk:~/v2ray# echo -e '{"inbound":{"port":80,"listen":"0.0.0.0","protocol":"vmess","settings":{"clients":[{"id":"dd4523c3-fa0a-4aa3-acfe-0a49c7f643ce","alterId":64}]},"streamSettings":{"network":"ws","wsSettings":{"path":"/ws"}}},"outbound":{"protocol":"freedom","settings":{}}}' > config.json
```

默认监听服务器端 80 端口，路径为 `/ws`，UUID 如有需要请自行更改，当然，不改也没事，反正这玩意又不是花钱买来的。

随后用 screen 命令，后台运行 V2Ray。

```
root@1edc23sfk:~/v2ray# screen -dmS v2ray /root/v2ray/v2ray -config=/root/v2ray/config.json
```

V2Ray 折腾完了。现在，打开 Endpoint 的网页，探测 `/ws` 路径，出现 400 Bad Request 的错误，则可初步判断 V2Ray 已经在运行。

那么接下来就是在本地的操作了。

#### 客户端配置文件

贴出对应的客户的配置文件，更改 `example.arukascloud.io`、“id”为自己的设置，将其保存为 `config.json`，然后在本地设定 Socks 代理 127.0.0.1:1080，即可出墙。

```
{
  "inbounds": [
    {
      "port": 1080,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"]
      },
      "settings": {
        "auth": "noauth",
        "udp": false
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "vmess",
      "settings": {
        "vnext": [
          {
            "address": "example.arukascloud.io",
            "port": 443,
            "users": [
              {
                "id": "dd4523c3-fa0a-4aa3-acfe-0a49c7f643ce",
                "alterId": 64
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "security": "tls",
        "wsSettings": {
          "path": "/ws"
        }
      }
    }
  ]
}
```

## 利用吃灰小鸡加速 Arukas

Arukas 的 IP 很香，居然可以解锁 Netfilx，然而其网络早已被大佬们撸坏，就连日间速度都不过 500Kbps 左右。正好手里有一台 192MB 内存的美国小鸡，所以博主决定通过 Caddy 中转一下，继续白女票 Arukas 家的网络。

这台美国小鸡安装的是烂大街的 CentOS7，由于内存太小，拖 Nginx 很费力，所以使用 Golang 编写的 Caddy Server 来反代 Endpoint。同时为了方便起见，这里仍然使用 screen 后台运行 Caddy。

首先安装 screen

```
root@vps:~# yum install screen
```

安装 Caddy

```
root@vps:~# mkdir caddy caddy/wwwroot
root@vps:~# cd caddy
root@vps:~/caddy# wget https://github.com/mholt/caddy/releases/download/v0.11.3/caddy_v0.11.3_linux_amd64.tar.gz
root@vps:~/caddy# tar -vxf caddy_v0.11.3_linux_amd64.tar.gz
root@vps:~/caddy# chmod +x caddy
```

写入配置文件，example.org 和邮箱替换成自己的真实信息。

```
root@vps:~/caddy# echo -e "example.org {\n    tls example@example.org\n    root /root/caddy/wwwroot\n    timeouts 10m\n    proxy /ws https://example.arukascloud.io {\n        websocket\n        header_upstream -Origin\n    }\n}" > Caddyfile
```

然后，后台运行 Caddy。

```
root@vps:~/caddy# screen -dmS caddy /root/caddy/caddy -conf=/root/caddy/Caddyfile
```

至此，Arukas 将通过这台吃灰小机中转。修改上述客户端中的地址为反代服务器的新域名，感受更快的网络吧！

## 备注

 - 由于 Arukas 会自动重启，为了避免重启之后再次配置，故博主写了一个 Docker 镜像，以实现容器的持久化。其原理与这篇文章大致相同。
[bclswl0827/v2ray-arukascloud](https://github.com/bclswl0827/v2ray-arukascloud)

 - 现在，针对 Arukas 的 TCP 阻断在一些地方已经停止。这意味着 V2Ray 的其它协议 和 Shadowsocks 可以继续正常使用...