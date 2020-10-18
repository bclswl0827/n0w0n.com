---
title: ADS-B：从入门到入狱
date: 2020-01-18 17:30:06
categories: "广播"
tags:  [广播,原创,SDR,瞎搞]
---
听惯了中短波广播，甚至已经能准确说出当前的某个频率对应哪个电台在播音... 是的，博主终于对传统广播有了倦意，也正因如此，最后博主决定拿出闲置的 RTL-SDR，玩玩 ADS-B 接收。

在这篇文章中，博主将介绍如何用 RTL-SDR 接收 1090MHz，由航班下发的 ADS-B 信号，并将实时航班情况展示在地图上，公开至外网，给喜欢的她装个逼，然后坐等被喝茶（

[现在，博主的 ADS-B 监测站点已经上线，欢迎来踩～](https://a.ibcl.us)

![博主的 SDR 服务器](https://cdn-image.ibcl.us/ADSB-Decode_20200118/1.jpg "博主的 SDR 服务器")

<!--more-->

# 设备

 - RTL-SDR 及其附赠天线
 - 装了 Linux 的主机（Linux 大法好

需要注意的是，RTL-SDR 有着不同的芯片方案，即 RTL2832U+ [ xx 芯片 ]。不同的芯片方案，覆盖的频率范围和灵敏度也不同，这是尤其要注意的。

再把之前在[《Re：从零开始的 RTL-SDR 折腾记》](https://ibcl.us/RTLSDR-Modifying_20190323/)一文中的那份表格贴上来...

| 芯片方案 | 频率范围 | 情况 | 
| :------- | :------- | :--- | 
| RTL2832U+E4000 | 54-2200 MHz | 已停产 |
| RTL2832U+R820T | 24-1766 MHz | 最容易取得 |
| RTL2832U+R820T2 | 24-1766 MHz | 接收能力最强 |
| RTL2832U+FC0013 | 22-1100 MHz | 灵敏度最差 |
| RTL2832U+FC0012 | 22-948 MHz | 未知 |

博主所购买的还是 CNY 42（不含运费）的那一款 SDR，其芯片方案是 RTL2832U+R820T2。如果有特别需求，可以购买 CNY 120 左右的，带温度补偿晶振（TXCO）的那款 RTL-SDR，其芯片方案同样是 RTL2832U+R820T2。

![RTL2832U+R820T2](https://cdn-image.ibcl.us/ADSB-Decode_20200118/2.jpg "RTL2832U+R820T2")

此外，本文的 Linux 发行版选用 Debian Stretch。

# 方案

软件选用由 FlightAware 所维护的 dump1090，安装在博主的斐讯 N1 上，好在 N1 有两个 USB 口，CPU 也比较强劲，同时拖两个 SDR 完全够了。

这里，用于[本站 WebSDR 页面](https://s.ibcl.us)的 RTL-SDR 编号为 `0`，用于 ADS-B 接收的 RTL-SDR 编号为 `1`。关于如何获取 RTL-SDR 设备编号的问题，这里给出一个比较简单的方法。

  1. 首先保证先前的 RTL-SDR 正在被使用；
  2. 插入新的 RTL-SDR；
  3. 在终端上执行命令 `rtl_test`，不出意外，得到以下回显，能够看到，rtl_test 探测到了两个 RTL-SDR，并提示因 `0` 号设备被占用而无法打开。现在可以得出 `1` 号设备即是新插入的 RTL-SDR；
```
root@BelovedZY:~# rtl_test
Found 2 device(s):
  0:  Realtek, RTL2838UHIDIR, SN: 00000001
  1:  Realtek, RTL2838UHIDIR, SN: 00000001

Using device 0: Generic RTL2832U OEM
usb_claim_interface error -6
Failed to open rtlsdr device #0.
```
  5. 记下 `1` 这个数字为新插入的 RTL-SDR。

至于 ADS-B 使用的天线，由于条件所限，只能放在窗边（虽然博主知道这样很敷衍了啦

最后，dump1090 的页面使用 Frp 内网穿透到博主服务器上的 8082 端口，然后通过 Nginx 反向代理到服务器的 80 端口，接上 CloudFlare，供人访问。

# 开搞

以下的过程，均是在 root 用户下的操作，如果是子用户，博主建议先用 `sudo -i` 命令进入 root 模式后再进行下面的操作。

## 准备环境

dump1090 依赖于 RTL-SDR 的驱动和支持库工作，同时 RTL-SDR 通过 USB 与主机连接，所以要安装 rtl-sdr、librtlsdr-dev、libusb-1.0-0-dev 三个依赖项。

由于需要从 GitHub 拉取 dump1090 的源码编译并打包为 deb 文件，所以还需要安装 git、build-essential、pkg-config、debhelper、dh-systemd、libncurses5-dev、libbladerf-dev。

此外，由 FlightAware 所维护的 dump1090 是作为 Lighttpd 的一个模块而存在的，所以也必须安装 lighttpd 这个软件。

综合一下，在终端下执行如下命令，将上述软件一并安装。

```
root@BelovedZY:~# apt update
root@BelovedZY:~# apt install build-essential debhelper rtl-sdr libusb-1.0-0-dev librtlsdr-dev pkg-config dh-systemd libncurses5-dev libbladerf-dev git lighttpd -y
```

## 编译安装

拉取 dump1090 的源码到本地，然后进入源码目录，编译打包。

```
root@BelovedZY:~# cd /home
root@BelovedZY:/home# git clone https://github.com/flightaware/dump1090
root@BelovedZY:/home# cd dump1090
root@BelovedZY:/home/dump1090# dpkg-buildpackage -b
```

稍等片刻，即可在上一层目录找到打包好的 deb 文件。

```
root@BelovedZY:/home/dump1090# cd ../
root@BelovedZY:/home# ls
dump1090                  dump1090-fa_3.8.0_arm64.buildinfo  
dump1090_3.8.0_all.deb    dump1090-fa_3.8.0_arm64.changes
dump1090-fa-dbgsym_3.8.0_arm64.deb    dump1090-fa_3.8.0_arm64.deb
```

文件名可能会因 CPU 架构而有所不同，但都大同小异，记下文件名，分别将其安装。

```
root@BelovedZY:/home# dpkg --install dump1090-fa_3.8.0_arm64.deb
root@BelovedZY:/home# dpkg --install dump1090_3.8.0_all.deb
```

## 配置调整

修改 /etc/default/dump1090-fa，这是 dump1090 的配置文件。

```
root@BelovedZY:/home# vi /etc/default/dump1090-fa
```

首先配置 dump1090 开机启动，直接将配置文件中 `ENABLED` 字段赋值为 `yes` 即可。

由于要指定 dump1090 使用 `1` 号 RTL-SDR，所以需要修改 `RECEIVER_OPTIONS` 字段，加入 `--device-index 1 --gain 50`，告诉 dump1090 打开 `1` 号 SDR，增益为 50dB。增益根据实际情况而定，正负值均可。

最后是告诉 dump1090 博主所处的经纬度，考虑到安全，可以填一个大致的位置。博主所处纬度 31.170280，经度 108.404610，所以在 `DECODER_OPTIONS` 字段加入 `--lat 31.170280 --lon 108.404610` 这样一句话。

综合上述要求，这里给出一个配置文件示范。

```
# dump1090-fa configuration
# This is sourced by /usr/share/dump1090-fa/start-dump1090-fa as a
# shellscript fragment.

# If you are using a PiAware sdcard image, this config file is regenerated
# on boot based on the contents of piaware-config.txt; any changes made to this
# file will be lost.

# dump1090-fa won't automatically start unless ENABLED=yes
ENABLED=yes

RECEIVER_OPTIONS="--device-index 1 --gain 50 --ppm 0"
DECODER_OPTIONS="--lat 31.170280 --lon 108.404610 --max-range 360 --fix"
NET_OPTIONS="--net --net-heartbeat 60 --net-ro-size 1300 --net-ro-interval 0.2 --net-ri-port 0 --net-ro-port 30002 --net-sbs-port 30003 --net-bi-port 30004,30104 --net-bo-port 30005"
JSON_OPTIONS="--json-location-accuracy 1"
```

修改完后，保存并退出。

## 启动

前面已经提到，由 FlightAware 所维护的 dump1090 是作为 Lighttpd 的一个模块而存在的，所以启动的方式是使用 lighty-enable-mod 加载这个模块。

```
root@BelovedZY:/home# lighty-enable-mod dump1090-fa
root@BelovedZY:/home# service lighttpd force-reload
```

加载这个模块后，重启使其生效。

```
root@BelovedZY:/home# reboot
```

重启完成后，访问 `http://[N1 对应的 IP 地址]/dump1090-fa/`，就可以看到列在地图上的实时 ADS-B 数据了～

![效果图](https://cdn-image.ibcl.us/ADSB-Decode_20200118/3.jpg "效果图")

# 公开数据等喝茶

## 内网穿透

以 Frp 为例，服务器上已经安装好了 Frp 的服务端 Frps，传入端口为 7000，IP 地址 1.2.3.4，认证密钥为 ibcl.us。本地也安装好了 Frp 的客户端 Frpc，并通过 tcp 与服务器端建立连接。

给出 Frpc 的配置文件。

```
[common]
server_addr = 1.2.3.4
server_port = 7000
token = ibcl.us
pool_count = 10
tcp_mux = true
login_fail_exit = false
protocol = tcp
tls_enable = true
[a.ibcl.us]
type = tcp
local_ip = 127.0.0.1
local_port = 80
use_encryption = false
use_compression = true
remote_port = 8082
```
运行 Frpc，与服务器对接，随后登入服务器，修改 Nginx 的相关配置文件，将 8082 端口反向代理到 80 端口。

在 Nginx 相关配置文件里，加入反向代理的相关内容。

```
location /
{
    proxy_pass http://127.0.0.1:8082/dump1090-fa/;
}
```

保存并退出后，重载 Nginx，大功告成～

## 坐等喝茶

根据某乎上某些大佬对相关法律政策的解读，个人私下接收 ADS-B 信号并不构成违法。好比收听传统的无线电广播，ADS-B 的原理也注定了它不可能被禁止，毕竟，ADS-B 也是无线电广播，而且，严禁收听敌台的年代已经成为历史。

话是这样说没错啦，但据这位大佬的介绍，若将接收到的 ADS-B 数据公开或是传送至境外组织，则是违法行为...

《中华人民共和国无线电管理条例（2016）》中第七十五条提到：

> 违反本条例规定，有下列行为之一的，由无线电管理机构责令改正；拒不改正的，没收从事违法活动的设备，并处 3 万元以上 10 万元以下的罚款；造成严重后果的，并处 10 万元以上 30 万元以下的罚款：
>  1. 研制、生产、销售和维修大功率无线电发射设备，未采取有效措施抑制电波发射；
>  2. 境外组织或者个人在我国境内进行电波参数测试或者电波监测；
>  3. 向境外组织或者个人提供涉及国家安全的境内电波参数资料。

所以... 博主违法了？

所以... 博主会被请喝茶？

值得一提的是，直至目前，国内已有好几起因接收 ADS-B 信号并为 FlightRadar24 等组织提供实时航班数据而被~~有关部门~~没收接收设备的案例。

或许... 博主的名字会出现在下一批名单中？

那么，还请诸位看官静候博主喝茶归来的消息（大雾

# 尾声

最后，博主冒着被喝茶的风险，将搭建好的 ADS-B 站点展示给她看，只换来了一句话...

> nb

估计她根本就不晓得这是个什么玩意叭？

嗯，革命尚未成功，博主仍需努力！

*“她”是谁？[了解更多猛料，请阅读博主的上一篇文章](https://ibcl.us/Beloved-Her_20200105/)。*