---
title: FlightFeeder 白嫖背后的阴谋（续）
date: 2020-06-01 0:00:00
categories: "广播"
tags:  [广播,原创,SDR,瞎搞]
---
*应读者要求，博主将在这篇文章中介绍如何优雅地向 FlightAware 上传数据。*

# 前情提要

在上一篇博文中，博主在文章结尾处粗略提到了安装 PiAware 过后通过透明代理向 FlightAware 上传 ADS-B 资讯。但一段时间后博主发现，即便是这样，也依然免不了 FlightAware 每个礼拜定期的邮件轰炸。

可能是 FlightAware 的工作人员等得不耐烦了，最后还亲自给博主发了一封邮件。

```
Matt H (FlightAware)
Apr 13, 13:16 CDT

Hi（您好）

This is FlightAware Support.（这里是 FlightAware 支援部。）

We shipped you FlightFeeder serial number 5784 on 2020-01-29.（我们于 2020 年 1 月 29 日向您发送了序列号为 5784 的 FlightFeeder。）

Did you receive the shipment OK? If you did, is there anything we can do to help you install it?（您收到货物了吗？如果确实如此，需要我们帮助您安装吗？）

It would be great to get you up and running as soon as possible and activate your free Enterprise account. So please get back to me for any assistance we can provide.（若您可以尽快运行，并激活您的免费企业帐户的话，将会是非常棒的。所以请回复我，以为您提供任何帮助。）

*** If this installation delay is related to COVID-19, please let us know and we will make a note on your account（如果推迟安装与 COVID-19 有关，请让我们知道，并为您记录） ***

Matt
FlightAware
```

博主将这一遭遇告诉某位大佬过后，大佬却给了个馊主意。

> 你就给他们回复说你得了新型肺炎，在接受治疗。接下来不管他们给你发什么电邮，你都不要理会了。

言外有意，话中有话，这不咒博主去阴间嘛！

缺德的事还是干不得，毕竟账是记在那的。既然现在已经具备了透明代理的条件，干脆就装上带有后门的 FlightFeeder 全家桶吧！

<!--more-->

起初，博主也想要把 FlightFeeder 全家桶隔离在容器中运行，然而一番实践后才发现这一方案并不能实现，因为 FlightFeeder 全家桶要求在安装完成过后重启系统，然而 Docker 的运行策略却又不允许直接重启容器。

在这进退两难的情况下，博主只好选择了在宿主机上直接安装 FlightFeeder 全家桶。

# 偷梁换柱

鉴于都是 ARMv7l 的开发板，于是博主将 FlightFeeder 随机附上的 RaspberryPi 3B 换成了淘汰下来的 OrangePi Lite（逃

尝试过各种姿势后，原先固定 RaspberryPi 3B 的位置勉强能装下 OrangePi Lite，但是外壳却盖不上了（哭

反正 FlightAware 的又不知道博主对 FlightFeeder 进行了魔改，总的来说，还是省下了一块 RaspberryPi 3B，实属血赚。

# 准备工作

 - ARMv7l 架构开发板一块（如上文所述，博主已经有了）；
 - GitHub 账户（这个应该人手一个）；
 - FlightFeeder 序列号和 MAC 地址（位于 FlightFeeder 包装的标签上）

# Armbian Jessie

这块 OrangePi Lite 上原本运行着 Armbian Buster。博主将 FlightAware 的软件源地址填入 `/etc/apt/sources.list` 后，便以为大功告成，可以安装 `flightfeeder-release` 了（要真有这么简单，哪来这篇水文？

然而一番尝试后，博主却发现 FlightAware 的软件包只能适用于 Raspbian Jessie。更可恶的是，Armbian 的下载站中，Armbian Jessie 的镜像早已被移除......

好你个小贱贱 FlightAware！

没有办法，博主只好翻出上古时期的 Armbian 源码，尝试自行编译 Armbian Jessie......

---

最近亲爸爸微（巨）软（硬）推出了基于 Azure 的 CI/CD 服务：Github Actions。就算是免（乞）费（丐）用户，也可以享受 E5 2vCPU / 7G RAM 的高配虚拟服务器，此外， 对于公共仓库而言，Actions 也没有使用时间上的限制。

这么香的免费服务，不充分利用起来感觉简直亏了一个亿。

正巧，博主的服务器全部处于生产环境，不敢瞎搞，于是 Github Actions 成了编译上古 Armbian Jessie 的第一选择。

参照着 Github Actions 和 Armbian 的开发文档，加上博主一番瞎搞和无数次 Build Failed，一个用于 Github Actions 的 Armbian 编译项目出炉了～

[bclswl0827/Actions-Armbian](https://github.com/bclswl0827/Actions-Armbian)

同时，博主也把通过 GitHub Actions 编译好的适用于 OrangePi Lite 的 Armbian Jessie 镜像存放在了本站的文件库中，可以直接下载解压刷入 SD 卡使用。

对于使用的是 OrangePi Lite 以外或者其他型号开发板的用户，可以登入 GitHub 账户后，使用这个项目作为模板（非 Fork！），修改 workflow 中的 `BOARD` 变量后进行自动化编译，大概一个小时后即可拿到针对该型号开发板的 Armbian Jessie 镜像（真 · 零成本编译

此外，对于那些直接使用随机附上的 RaspberryPi 3B 的用户，博主也提供了一份此前 RaspberryPi 官方留下的 Raspbian Jessie 镜像，同样位于本站文件库中。

# 搞事情

## 换源+平滑切换 Raspbian Jessie

在完成刷写工作并对开发板进行必要的配置后，将其连上网络，博主要开始正式操作了。

首先通过 SSH 登入开发板，然后换源。

由于国内直连到 FlightAware 的服务器有着及其感人的速度，所以博主使用 CloudFlare 对其进行了反向代理（可怜的 CloudFlare！

```
root@orangepilite:~# echo "1.0.0.1 m.ibcl.us" >> /etc/hosts
root@orangepilite:~# rm -rf /etc/apt/sources.list.d/*
root@orangepilite:~# echo "deb https://m.ibcl.us/mirror/raspbian/raspbian/ jessie main contrib non-free firmware" > /etc/apt/sources.list
root@orangepilite:~# echo "deb https://m.ibcl.us/adsb/flightfeeder/files/packages jessie flightfeeder" > /etc/apt/sources.list.d/flightfeeder-jessie.list
root@orangepilite:~# echo "deb https://m.ibcl.us/mirror/raspberrypi/debian/ jessie main ui" > /etc/apt/sources.list.d/raspberrypi.org.list
root@orangepilite:~# apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 9165938D90FDDD2E
root@orangepilite:~# apt-key adv --keyserver keyserver.ubuntu.com --recv-keys B931BB28DE85F0DD
root@orangepilite:~# apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 82B129927FA3303E
root@orangepilite:~# apt update
```

值得一提的是，虽然 Armbian、Raspbian 都由 Debian 修改而来，但两者仍然存在区别，所以还需要通过 upgrade 的操作，将 Armbian Jessie 平滑地切换到 Raspbian Jessie。

不过，对于直接使用随机附上的 RaspberryPi 3B 用户，则可以跳过这一步。

```
root@orangepilite:~# apt upgrade -y
```

不争气的 OrangePi Lite，再配上一张上古时期 4 GB ~~高速~~ SD 卡，这一步花了博主一个半个小时......

在做完这一切后，执行重启。

```
root@orangepilite:~# reboot
```

重启过后，可以看到，系统的发行版已经变成了 Raspbian Jessie。

```
root@orangepilite:~# cat /etc/issue
Raspbian GNU/Linux 8 \n \l
```

## 安装 FlightFeeder 全家桶

既然已经切换到了 Raspbian，接下来就可以直接安装 FlightFeeder 全家桶了。

```
root@orangepilite:~# mkdir /boot/overlays # RaspberryPi 用户无需执行此命令
root@orangepilite:~# apt install flightfeeder-release -y
```

本来两条简单的命令，却让博主又苦等了一个小时（哭

需要注意的是，在安装过程中，dpkg 会询问是否保留涉及改动系统配置的操作，博主的建议是全部回答 `Y` 或选择 Yes。

此外，由于驱动不兼容的问题，如果在安装过程中出现了依赖性错误，可以使用 `dpkg -i --force-overwrite` 进行强制安装以解决。

```
Errors were encountered while processing:
 /var/cache/apt/archives/firmware-linux-nonfree_1%3a0.43+rpi6_all.deb
 /var/cache/apt/archives/firmware-ralink_1%3a0.43+rpi6_all.deb
 /var/cache/apt/archives/firmware-ti-connectivity_1%3a0.43+rpi6_all.deb
E: Sub-process /usr/bin/dpkg returned an error code (1)
```

所以针对上述错误，补救的命令如下。

```
root@orangepilite:~# dpkg -i --force-overwrite /var/cache/apt/archives/firmware-linux-nonfree_1%3a0.43+rpi6_all.deb
root@orangepilite:~# dpkg -i --force-overwrite /var/cache/apt/archives/firmware-ralink_1%3a0.43+rpi6_all.deb
root@orangepilite:~# dpkg -i --force-overwrite /var/cache/apt/archives/firmware-ti-connectivity_1%3a0.43+rpi6_all.deb
```

然后继续执行 FlightFeeder 安装进程。

```
root@orangepilite:~# apt -f install flightfeeder-release -y
```

让博主没有想到的是，当安装进程接近尾声时，还出现了来自 `initramfs-tools` 的报错（垃圾 OrangePi Lite！

```
ln: failed to create symbolic link '/var/tmp/mkinitramfs_QURWJ5//sbin/fsck.ext4': File exists
E: /usr/share/initramfs-tools/hooks/fsck failed with return 1.
update-initramfs: failed for /boot/initrd.img-3.4.113-sun8i with 1.
dpkg: error processing package initramfs-tools (--configure):
 subprocess installed post-installation script returned error exit status 1
Errors were encountered while processing:
 initramfs-tools
E: Sub-process /usr/bin/dpkg returned an error code (1)
```

博主只好去到 Ask Ubuntu 中逛了一圈，不过还是很幸运，找到了个还算凑合的解决方法。

```
root@orangepilite:~# rm -f /var/lib/dpkg/info/initramfs-tools.post*
root@orangepilite:~# rm -f /var/lib/dpkg/info/initramfs-tools.pre*
root@orangepilite:~# rm -f /var/lib/dpkg/info/bcmwl-kernel-source.post*
root@orangepilite:~# rm -f /var/lib/dpkg/info/bcmwl-kernel-source.pre*
root@orangepilite:~# dpkg --configure -a
```

再执行一次 FlightFeeder 安装命令，这下就没有报错了。

看来有时必要的暴力手段才能解决问题。

```
root@orangepilite:~# apt -f install flightfeeder-release -y
Reading package lists... Done
Building dependency tree      
Reading state information... Done
flightfeeder-release is already the newest version.
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
```

安装完成后，此前准备工作中的 FlightFeeder 序列号便派上用场了，博主的序列号是 `5784`，FlightFeeder 型号是 G7，通过 echo 命令写入配置文件。

此外，FlightFeeder 不允许 root 和使用密码登入，这造成了极大的不便，所以需要对 SSH 配置文件进行修改。

另外，为了以防万一，还需要自己创建一个带有 sudo 权限的子用户，这里以用户名 `zy`，密码 `5201314` 为例。

```
root@orangepilite:~# export SERIAL=5784 # 换为标签上的序列号
root@orangepilite:~# echo -e "flightfeeder-serial $SERIAL\nflightfeeder-commissioned yes\nflightfeeder-model G7" > /etc/flightfeeder.conf
root@orangepilite:~# sed -ri 's/PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
root@orangepilite:~# sed -ri 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
root@orangepilite:~# useradd -m zy -d /usr/local/zy -s /bin/bash
root@orangepilite:~# echo "zy:5201314" | chpasswd
root@orangepilite:~# adduser zy sudo
```

## 伪装 MAC 地址

对于直接使用随机附上的 RaspberryPi 3B 的用户，这步也是可以直接跳过的。

因为博主使用的是 OrangePi Lite，而 MAC 地址也是 FlightAware 识别身份的一个手段，所以博主需要将 OrangePi Lite 的 MAC 地址修改为原 RaspberryPi 的 MAC 地址。

记下 FlightFeeder 包装上的 MAC 地址，其中第一个 MAC 地址用于有线连接，第二个 MAC 地址则是无线网卡，可以忽略。他们分别对应 `eth0` 和 `wlan0`。

但是由于 OrangePi Lite 没有有线网口，所以需要使用 TAP 添加一个虚拟网卡，骗过 FlightFeeder 的检测。

MAC 地址以 `AA:BB:CC:DD:EE:FF` 为例，用 echo 命令（反正我知道你们都是复制粘贴）将上述命令加入 `/etc/rc.local`。

```
root@orangepilite:~# export ETH0_MAC="AA:BB:CC:DD:EE:FF" # 替换为标签上的有线网卡 MAC
root@orangepilite:~# apt install -y uml-utilities
root@orangepilite:~# modprobe tun
root@orangepilite:~# echo -e "#!/bin/sh -e\ntunctl -t eth0\nifconfig eth0 down\n/sbin/ifconfig eth0 hw ether $ETH0_MAC\nifconfig eth0 up\nexit 0" > /etc/rc.local

```

如果同时具有有线网口和无线网络，则无需安装 TAP，只需对上述命令稍作改动即可。

```
root@orangepilite:~# export ETH0_MAC="AA:BB:CC:DD:EE:FF" # 替换为标签上的有线网卡 MAC
root@orangepilite:~# echo -e "#!/bin/sh -e\n/sbin/ifconfig eth0 down\n/sbin/ifconfig eth0 hw ether $ETH0_MAC\n/sbin/ifconfig eth0 up\nexit 0" > /etc/rc.local
```

## 启用透明代理

鉴于因为使用 FlightFeeder 而被喝茶的例子已经不少，吸取了先人的教训，所以有必要配置透明代理。

对于某些路由器而言，配置透明代理是件轻松的事情，然而对于那些不具备这个功能的路由器而言，则会稍微麻烦一些。

在这个示例中，使用的是本站的公益节点。为了方便起见，博主将其做成了安装脚本。

```
root@orangepilite:~# curl -o v2ray.tar.gz https://c.ibcl.us/ADSB-FlightFeeder_20200601/v2ray.tar.gz
root@orangepilite:~# tar -xvf v2ray.tar.gz
root@orangepilite:~# ./install.sh
```

然后 V2Ray 会被放入开机启动项，并自动启动，同时，这份脚本也将会自动配置透明代理。

最后，使用 curl 查看 IP 地址，发现 IP 已经是本站公益节点的位置了。

```
root@orangepilite:~# curl ip.sb
34.83.158.249
```

做好了以上准备，就可以重启了～

```
root@orangepilite:~# reboot
```

重启过后，再次连上 SSH，查看 piaware，发现 FlightFeeder 已经运行成功。

```
root@orangepilite:~# systemctl status piaware
* piaware.service - FlightAware ADS-B uploader
   Loaded: loaded (/lib/systemd/system/piaware.service; enabled)
  Drop-In: /lib/systemd/system/piaware.service.d
           `-vmlimit.conf
   Active: active (running) since Sun 2020-05-31 15:44:03 UTC; 2min 47s ago
     Docs: https://flightaware.com/adsb/piaware/
 Main PID: 804 (piaware)
   CGroup: /system.slice/piaware.service
           |- 804 /usr/bin/piaware -p /run/piaware/piaware.pid -plainlog -statusfile /run/piaware/status.json
           |-1068 /usr/lib/piaware/helpers/faup1090 --net-bo-ipaddr localhost --net-bo-port 30005 --stdout --lat 31.177 --lon 108.397
           `-1270 /usr/lib/piaware/helpers/fa-mlat-client --input-connect localhost:30005 --input-type beast --results beast,connect,localhost:30104 --results beast,listen,30105 --results ext_basestation,listen,30106 --udp-transport 7...

May 31 15:46:23 ff-5784 piaware[804]: Starting multilateration client: /usr/lib/piaware/helpers/fa-mlat-client --input-connect localhost:30005 --input-type beast --results beast,connect,localhost:30104 --results beast...56:19321:51418804
May 31 15:46:23 ff-5784 piaware[804]: mlat-client(1270): fa-mlat-client 0.2.10 starting up
May 31 15:46:23 ff-5784 piaware[804]: mlat-client(1270): Using UDP transport to 70.42.6.156 port 19321
May 31 15:46:23 ff-5784 piaware[804]: mlat-client(1270): Listening for Beast-format results connection on port 30105
May 31 15:46:23 ff-5784 piaware[804]: mlat-client(1270): Listening for Extended Basestation-format results connection on port 30106
May 31 15:46:23 ff-5784 piaware[804]: mlat-client(1270): Input connected to localhost:30005
May 31 15:46:23 ff-5784 piaware[804]: mlat-client(1270): Input format changed to BEAST, 12MHz clock
May 31 15:46:23 ff-5784 piaware[804]: mlat-client(1270): Input format changed to RADARCAPE, 1000MHz clock
May 31 15:46:24 ff-5784 piaware[804]: mlat-client(1270): Beast-format results connection with 127.0.0.1:30104: connection established
May 31 15:46:43 ff-5784 piaware[804]: piaware has successfully sent several msgs to FlightAware!
```

同时，在 FlightFeeder 的账户页面中，也可以看到签入 FlightAware 使用的 IP 是本站的公益节点。

至此，FlightFeeder 的改装告一段落。

# 尾声

可惜的是，博主的 OrangePi Lite 装上 FlightFeeder 全家桶之后，HDMI 却用不了了，虽然自己并没有这个需求，不过还是觉得不太完美......

算啦算啦，将就用吧！

最后，博主顺利得到了 FlightAware 免费企业帐户，不过要是被 FlightAware 知道了博主的这番操作，怕不是会死得很惨......

还是闷声发大财的好！ 