---
title: 在 Heroku 搭建 V2Ray
date: 2019-10-14 23:22:00
categories: "杂谈"
tags:  [杂谈]
---
**重要：由于 V2Ray 修改了自动安装脚本，导致 bclswl0827/v2ray-heroku 该镜像在 Heroku 无法运行。修改 Dockerfile 后问题已经解决，现在请 2020 年 2 月 20 日前部署过本镜像的用户，删除原先的 V2Ray 应用，并重新在 Heroku 部署本镜像。**

**已经 Fork 过这个项目的用户，请重新 Fork 一次。**

# 概述

在白嫖党的强势围攻之下，Arukas 终于宣布倒闭，并将于 2020 年 1 月 31 日关闭所有服务。

> Dear Arukas users,
> We will shutdown of service on January 31, 2020 (JST).

又一个免费服务被撸翻了车，默默为 Arukas 心疼一秒...

算下来的话，现在还在运营中的，提供免费容器的也就只有 OpenShift 和 Heroku 了，很气的是，OpenShift 在今年二月左右变更了政策，此前可以一直使用的 OpenShift Starter 的有效期改为了只有两个月，到期之后需要重新申请免费的 OpenShift Starter 并重新部署应用。

于是 Free Plan 变成了 Free Trail，顿时 OpenShift 就不香了。

对于白嫖党们来说，Arukas 的倒下和 OpenShift 政策的变更确实是一个极坏的消息，但是好在还有 Heroku 这个活雷锋，并且 Heroku 和 OpenSHift 一样是使用的 Amazon EC2...

或许可以再利用一波？

这篇水文，将介绍博主如何写 Dockerfie 以在 Heroku 上搭建 V2Ray。

默默为 Heroku 心疼两秒...

<!--more-->
# 思路

虽然网上已经有了现成的在 Heroku 搭建 V2Ray 的教程，但大多数都是东抄西搬来的内容。此外，根据一些人反馈的情况来看，在 Heroku 上部署 V2Ray 后帐户会被“秒封”。

在博主仔细看了这些用于 Heroku 搭建 V2Ray 的 Dockerfile 后，找出了可能封号的原因，大致三种情况。

 - 所选用系统过于庞大，几近 60MB，占用了过多的空间；
 - 同时运行了 V2Ray 和 Caddy，占用大量资源；
 - 用户长时间大流量连接单个应用，超出限额·引起管理员怀疑。

针对这些问题，博主也给出了三个优化的方法。

 - 使用 Alpine Linux 在 Heroku 部署 V2Ray；
 - 让 V2Ray 监听 0.0.0.0，不通过 Caddy 反向代理；
 - 部署多个应用，配置 V2Ray 特有的[以轮询方式实现的简单的负载均衡](https://toutyrater.github.io/app/balance.html)，避免用户长时间大流量连接单个应用。

于是，博主用五行代码解决了 Dockerfile... 此外，配置镜像在部署时自动下载安装最新的 V2Ray，无需手动定义版本号。

```
FROM alpine:3.5
RUN apk add --no-cache --virtual .build-deps ca-certificates curl
ADD configure.sh /configure.sh
RUN chmod +x /configure.sh
CMD /configure.sh
```

V2Ray 需要用到的 UUID，这里通过环境变量来定义，但是 Heroku 要求把 ENV 写在 app.json 中... 此外，需要定义 `stack` 为 `container`。

```
{
	"name": "V2Ray",
	"description": "Deploy V2ray on Heroku.",
	"keywords": ["V2Ray"],
	"env": {
		"UUID": {
			"description": "V2Ray UUID",
			"value": "ad806487-2d26-4636-98b6-ab85cc8521f7"
		}
	},
	"website": "https://github.com/bclswl0827/v2ray-heroku",
	"repository": "https://github.com/bclswl0827/v2ray-heroku",
	"stack": "container"
}
```

Dockerfile 还引入了 Entrypoint，这个脚本是为了将 UUID 写入 V2Ray 的配置文件并运行 V2Ray 的。

```
#!/bin/sh
# Download and install V2Ray
curl -L -H "Cache-Control: no-cache" -o /v2ray.zip https://github.com/v2ray/v2ray-core/releases/latest/download/v2ray-linux-64.zip
mkdir /usr/bin/v2ray /etc/v2ray
touch /etc/v2ray/config.json
unzip /v2ray.zip -d /usr/bin/v2ray
# Remove /v2ray.zip and other useless files
rm -rf /v2ray.zip /usr/bin/v2ray/*.sig /usr/bin/v2ray/doc /usr/bin/v2ray/*.json /usr/bin/v2ray/*.dat /usr/bin/v2ray/sys*
# V2Ray new configuration
cat <<-EOF > /etc/v2ray/config.json
{
  "inbounds": [
  {
    "port": ${PORT},
    "protocol": "vmess",
    "settings": {
      "clients": [
        {
          "id": "${UUID}",
          "alterId": 64
        }
      ]
    },
    "streamSettings": {
      "network": "ws"
    }
  }
  ],
  "outbounds": [
  {
    "protocol": "freedom",
    "settings": {}
  }
  ]
}
EOF
/usr/bin/v2ray/v2ray -config=/etc/v2ray/config.json
```

由于 Heroku 只支持 ws + TLS，干脆就把协议写死好了。

最后是 heroku.yml，告知 Heroku 如何部署这个应用。

```
build:
  docker:
    web: Dockerfile
```

于是，一个用于在 Heroku 部署 V2Ray 的 Docker 镜像做好了～

# 部署

[本镜像现已开源至博主的 GayHub，欢迎 Star+Fork：bclswl0827/v2ray-heroku](https://github.com/bclswl0827/v2ray-heroku)

[一键部署至 Heroku。](https://dashboard.heroku.com/new?template=https%3A%2F%2Fgithub.com%2Fbclswl0827%2Fv2ray-heroku)

接下来便是尝试部署。

```
=== Fetching app code
=== Building web (Dockerfile)
Sending build context to Docker daemon  9.216kB
Step 1/5 : FROM alpine:3.5
latest: Pulling from library/alpine
9d48c3bd43c5: Pulling fs layer
9d48c3bd43c5: Download complete
9d48c3bd43c5: Pull complete
Digest: sha256:72c42ed48c3a2db31b7dafe17d275b634664a708d901ec9fd57b1529280f01fb
Status: Downloaded newer image for alpine:latest
 ---> 961769676411
Step 2/5 : RUN apk add --no-cache --virtual .build-deps ca-certificates curl bash
 ---> Running in b99ed707bc0c
fetch http://dl-cdn.alpinelinux.org/alpine/v3.5/main/x86_64/APKINDEX.tar.gz
fetch http://dl-cdn.alpinelinux.org/alpine/v3.5/community/x86_64/APKINDEX.tar.gz
(1/5) Installing ca-certificates (20190108-r0)
(2/5) Installing nghttp2-libs (1.39.2-r0)
(3/5) Installing libcurl (7.66.0-r0)
(4/5) Installing curl (7.66.0-r0)
(5/5) Installing .build-deps (20191014.154718)
Executing busybox-1.30.1-r2.trigger
Executing ca-certificates-20190108-r0.trigger
OK: 6 MiB in 18 packages
Removing intermediate container b99ed707bc0c
 ---> 5df76f7718fe
Step 3/5 : ADD configure.sh /configure.sh
 ---> d46cbec9cb4f
Step 4/5 : RUN chmod +x /configure.sh
 ---> Running in 2639e76f40c4
Removing intermediate container 2639e76f40c4
 ---> fc6979776c58
Step 5/5 : CMD /configure.sh
 ---> Running in 056b679218a9
Removing intermediate container 056b679218a9
 ---> 6ff840c77143
Successfully built 6ff840c77143
Successfully tagged 208417e4712e32ac36b36d2a902d93426dd3550b:latest
=== Pushing web (Dockerfile)
Tagged image "208417e4712e32ac36b36d2a902d93426dd3550b" as "registry.heroku.com/ibcl-us/web"
The push refers to repository [registry.heroku.com/ibcl-us/web]
0e0b51861c0a: Preparing
8ce982ffc400: Preparing
0b49aca41e7d: Preparing
03901b4a2ea8: Preparing
0e0b51861c0a: Pushed
03901b4a2ea8: Pushed
8ce982ffc400: Pushed
0b49aca41e7d: Pushed
latest: digest: sha256:dfc164ea98ce1af321d4251bdad0656aa104a9761d08ef3ddcf8cd5fec361775 size: 1153
```

部署成功了！

打开 Heroku 分配的 Endpoint，出现 Bad Request，可以大致判断 V2Ray 已经在运行。

博主一共部署了两个应用，配置了 V2Ray 的负载均衡，这里给出一个配置示例。

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
            "address": "1st.herokuapp.com",
            "port": 443,
            "users": [
              {
                "id": "40c98649-847b-412c-a229-5e68ca9985eb",
                "security": "auto",
                "alterId": 64
              }
            ]
          },
          {
            "address": "2nd.herokuapp.com",
            "port": 443,
            "users": [
              {
                "id": "40c98649-847b-412c-a229-5e68ca9985eb",
                "security": "auto",
                "alterId": 64
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "security": "tls"
      }
    }
  ]
}
```

经过测试，博主本地电信非高峰时段速度在 20Mbps 左右，应急使用是足够了。

此外，博主还搭建了[一个 V2Ray 公益节点](https://ibcl.us/nodes/)。

# 套上 ClouFlare

可惜电信国际出口晚上炸成了狗，Heroku 到中国的速度便连电话线都不如了。

~~偶然发现~~（其实早就知道了）Heroku 可以给应用绑定域名，所以给 Herokuapp 套上 CloudFlare，或许情况会好很多。

可怜的 CloudFlare（

## 有一个域名

值得一提的是，Heroku 需要先添加一张信用卡才能绑定域名。经过博主测试，银联信用卡成功绑定，并且会被识别为 Discover。

随后在应用中添加要绑定的域名，在 CloudFlare DNS 管理页中添加 Heroku 给出的对应 CNAME 地址，点亮 CloudFlare 云朵，即可完成绑定。

为了提高门槛防止 CloudFlare 被玩坏，此处不给出过于详细的教程。

## 没有信用卡和域名

但是也有一部分人没有信用卡和域名，但是也想白女票 CloudFlare 加速的，为了方便这一部分人，博主也想出来一个办法...

好在 CloudFlare 最近推出了他们的 Serverless 应用 CloudFlare Workers，Workers 使用的语言是 Node.js，借助 Workers，我们可以利用它反向代理部署的 Heroku 应用。

为了防止被玩坏，这里略去具体部署过程，只贴出反向代理的代码（

```
addEventListener(
  "fetch",event => {
     let url=new URL(event.request.url);
     url.hostname="应用名称.herokuapp.com";
     let request=new Request(url,event.request);
     event. respondWith(
       fetch(request)
     )
  }
)
```

部署完成后，将 Heroku 分配的链接改为 CloudFlare Workers 分配的应用链接即可～～

# 发个牢骚

但愿 Heroku 不是下一个 Arukas，不然就真的没得玩了...