---
title: FlightFeeder 白嫖背后的阴谋
date: 2020-03-19 17:30:06
categories: "广播"
tags:  [广播,原创,SDR,瞎搞]
---
某年某月某日，某无（国）限（安）垫（局）技（茶）术（道）讨（研）论（究）群（组）中出现了这样一段对话。

> 呐，听大佬说，FlightAware 的 FlightFeeder 套件本体是 Raspberry Pi 呢。

> So？白嫖安排上？

> 据说 FlightFeeder 会把 ADS-B 资讯上传到国外，有人因为这个喝了茶的。

> 国安的怎么知道 FlightFeeder 使用者的确切位置？这不科学啊！钓鱼执法？

> 可能是通过网络抓包吧？这个我也不清楚哈哈。

> 谁管这么多，先弄到手再说。

> ...

作为一个遵纪守法的好公（居）民，看到这种危险的言论，就应该立刻 jvbao，然后把这些不法分子一锅端掉，为维护国家的稳定做出贡献（手动滑稽

鼠标移到了“举报”键上，在离一锅端只有一步之遥时，博主却犹豫了...

---

博主是个穷人，买不起 Raspberry Pi 这种奢侈品，只能看其他人玩，能有一块 Raspberry Pi 是博主多年以来的梦想（大雾

然而现在，一个免费领 Raspberry Pi 的机会就在面前，为何要做 jvbao 这种傻事！

鼠标滑到 Chrome 的图标上，接着博主去到了 [FlightAware 的网站](https://flightaware.com/adsb/flightfeeder/)。

<!--more-->
# 壹

在填完一堆表格，并上传了居所东南西北方向的照片过后，博主终于通过了审核，并在 3 月初收到了来自德国的包裹。

![DHL 敦豪国际](https://c.ibcl.us/ADSB-FlightFeeder_20200319/1.jpg "DHL 敦豪国际")

除了 FlightFeeder 本体之外，还有 5M 长的电缆、ADS-B 天线、固定支架和树莓派的原装电源（awsl！原装电源诶！）

![FlightFeeder 本体](https://c.ibcl.us/ADSB-FlightFeeder_20200319/2.jpg "FlightFeeder 本体")

![5M 长电缆和 ADS-B 天线](https://c.ibcl.us/ADSB-FlightFeeder_20200319/3.jpg "5M 长电缆和 ADS-B 天线")

![固定支架](https://c.ibcl.us/ADSB-FlightFeeder_20200319/4.jpg "固定支架")

![树莓派原装电源](https://c.ibcl.us/ADSB-FlightFeeder_20200319/5.jpg "树莓派原装电源")

对了，还有一件丑到爆的 T 恤衫（

![FlightAware 定制 T 恤衫](https://c.ibcl.us/ADSB-FlightFeeder_20200319/6.jpg "FlightAware 定制 T 恤衫")

报价单上显示，这些物件总共价值 75 欧元，而且不包括邮费。

![报价单](https://c.ibcl.us/ADSB-FlightFeeder_20200319/7.jpg "报价单")

博主不得不感叹于 FlightAware 的大方，同时也因捡如此大的便宜而窃喜。

但事情真的就这么简单吗？

# 貳

收到 FlightFeeder 套件的第二天，博主收到了来自 FlightAware 的邮件，提醒博主需要在一周之内打开 FlightFeeder。

```
Hello from FlightAware!

We are pleased to inform you that your FlightFeeder kit has been delivered! We ask that you please install and power on your device within one week of receiving this email.

For reference, installation instructions can be found here: https://flightaware.com/adsb/flightfeeder/install

Need help with installation? Send us an email at adsbsupport@flightaware.com, so that we can assist you to get your FlightFeeder online as soon as possible. Also, please let us know if you no longer wish to host your FlightFeeder, and we will assist you to return it to us.

Thank you again for volunteering to host a FlightFeeder, we look forward to getting your device online!

-FlightAware
```

博主将 ADS-B 天线固定在了卧室落地窗前的护栏上，与外界只有一块玻璃之隔，至少这样能够避免天线被风吹雨打日晒，同时免去维护的麻烦。

![ADS-B 天线](https://c.ibcl.us/ADSB-FlightFeeder_20200319/8.jpg "ADS-B 天线")

部署好了天线和电缆，并连接到了 FlightFeeder，在准备打开 FlightFeeder 前的一刻，博主却心血来潮想要看看 FlightFeeder 本体内部树莓派 SD 卡中的内容...

于是，博主卸下了螺丝钉，打开了 FlightFeeder 的外壳，取出了树莓派和 SD 卡。

让博主没有想到的是，这个心血来潮的举动，让博主看到了 FlightFeeder 免费背后的阴谋~~，从而避免了一场世界大战的发生~~...

故事就此开始。

# 叁

接上读卡器，电脑识别出了一个 FAT16 分区和一个 Ext4 分区，前者存储了启动时的引导文件，而用于 FlightFeeder 的系统文件则在 Ext4 分区。

Fedora Linux 上，博主将这个分区挂载到了 /mnt

```
[root@BelovedZY ~]# mount /dev/sdb2 /mnt
```

先来看看 FlightFeeder 所使用的 Linux 发行版。

```
[root@BelovedZY ~]# cat /mnt/etc/issue
Raspbian GNU/Linux 8
```

FlightFeeder 使用的是 Debian jessie，算是比较老的版本了，此外，这个系统的软件源被替换成了 FlightAware 的地址，不光如此，系统还被添加了一个额外的 FlightAware  的软件源。

```
[root@BelovedZY ~]# ls /mnt/etc/apt/sources.list.d
flightfeeder-jessie.list  raspberrypi.org.list  raspberrypi.org.list~
[root@BelovedZY ~]# cat /mnt/etc/apt/sources.list.d/flightfeeder-jessie.list
deb http://flightaware.com/adsb/flightfeeder/files/packages jessie flightfeeder
```

有猫腻！

博主决定继续查下去。

# 肆

FlightFeeder 的进站提示（motd）已经被修改过，内容如下。

```
[root@BelovedZY ~]# cat /mnt/etc/motd
***************************************************************************
*           ACCESS IS RESTRICTED TO AUTHORIZED PERSONNEL                  *
*                                                                         *
* This is a privately owned computing system. Access is permitted only by *
* authorized employees or agents of the company.  The system may be used  *
* only for authorized company business.  Company management approval is   *
* required for all access privileges. This system is equipped with a      *
* security system intended to prevent and record all unauthorized  access *
* attempts. Unauthorized access or use is a crime under state law.        *
***************************************************************************

FlightFeeder unit xxxx (model G7)
Running software version 7.9.2~bpo8+1
```

浓缩为一句话，就是“访问限制于经批准者”。

接着，在 /mnt/etc 下，博主看到了 openvpn 的影子。

```
[root@BelovedZY ~]# ls /mnt/etc/openvpn
client.crt  ffvpn.conf           ffvpn-local.include.bak  openvpn-ta.key
client.key  ffvpn-local.include  openvpn-ca.crt           update-resolv-conf*
```

换句话说，借助这个 VPN 连接，FlightAware 的工作人员可以随便出入这个系统。

这怎么行？自己不能访问 SSH，还帮别人免费运行一台服务器，博主开始有些后悔了。

由于 OpenVPN 早已被某伟大的墙精准识别，博主怀疑那些被喝茶的先人，恐怕也是因为这个 VPN。

```
[root@BelovedZY ~]# cat /mnt/etc/openvpn/ffvpn.conf
# This configures the shared parts of the FlightFeeder management VPN.
# Additional configuration (e.g. network configuration specific to a FF)
# is configured via ffvpn-local.conf

client
dev tun

comp-lzo
verb 3

resolv-retry infinite
nobind

# TLS settings
ns-cert-type server         # require nsCertType of server on the peer cert
tls-auth openvpn-ta.key 1   # semi-secret HMAC key
ca openvpn-ca.crt           # FA CA
cert client.crt             # FlightFeeder-specific client cert
key client.key              # FlightFeeder-specific client cert secret key
tls-version-min 1.2
reneg-sec 0                 # let the server decide

# don't run ifconfig/ip directly
# instead run a script
script-security 2
ifconfig-noexec
up /usr/lib/flightfeeder-support/openvpn-up-script

# include ffvpn-local.conf for special connection settings
# e.g. http-proxy
config ffvpn-local.include

# fallback connection options to try
<connection>
remote 70.42.6.135 1194 udp
</connection>

<connection>
remote 70.42.6.135 443 tcp
</connection>

<connection>
remote 70.42.6.135 4194 udp
</connection>

<connection>
remote 70.42.6.135 4194 tcp
</connection>
```

此外，不难发现，FlightAware 的 OpenVPN 服务器 IP 地址是固定的，换言之，对于想要“精准扶贫”的国安人员来说，这是一个再好不过的特征。

既然已经拿到了这套设备，总不能放着吃灰啊。在一番深思熟虑过后，博主打算对这套设备进行改装，~~使之符合国情~~。

# 伍

根据 FlightAware 官网的用户条款，用户是被明确要求不得对 FlightFeeder 进行改装的。

然而博主将这一项规定拿给 BH4ERB 大佬过目时，却发现大佬一脸的不屑。

> 这玩意在国内本来就是违法的，你不给他们上传数据很正确，怎么处理是你的事情。

同时，他也表达了对 FlightFeeder 进行改装的愿望。

> 我申请到过后就一直扔在角落里没管，如果你能把他里面的驱动搞出来，在局域网里面玩玩，那还挺不错的。

既然这样的话，那就试试吧。

# 陆

FlightFeeder 内部，除了树莓派 3B，还有一块刻有 Mode-S Beast GPS 字样的板子。

![Mode-S Beast GPS](https://c.ibcl.us/ADSB-FlightFeeder_20200319/9.jpg "Mode-S Beast GPS")

Google 一番后，博主发现 Mode-S Beast 的驱动是开源的，这为改装的操作提供了很大的便利，不然就只能靠添加 FlightAware 的软件仓库来实现了...

准备好一张新的 SD 卡，刷入了来自树莓派官方的 Raspbian Buster 系统，于是博主开始搞事了。

计划中的，要从源码编译打包的软件有 beast-splitter 和 dump1090-fa，此外还需要编译安装作为 dump1090 依赖项而存在的 bladeRF。

---

首先准备编译的环境。

```
pi@raspberrypi:~$ sudo apt update
pi@raspberrypi:~$ sudo apt install -y git cmake build-essential debhelper librtlsdr-dev pkg-config dh-systemd libncurses5-dev libboost-system-dev libboost-program-options-dev libboost-regex-dev libusb-1.0-0-dev doxygen libtecla-dev libtecla1 help2man pandoc
```

然后将所需的源码拉取到本地，由于 Github 在国内速度太慢，博主是将其导入至国内的 Gitee 后再进行的拉取操作。

```
pi@raspberrypi:~$ git clone https://gitee.com/bclswl0827/bladeRF ~/src/bladeRF
pi@raspberrypi:~$ git clone https://gitee.com/bclswl0827/beast-splitter ~/src/beast-splitter
pi@raspberrypi:~$ git clone https://gitee.com/bclswl0827/dump1090 ~/src/dump1090
```

进入 beast-splitter 的源码目录，然后通过 dpkg 生成 deb 包。

```
pi@raspberrypi:~$ cd ~/src/beast-splitter
pi@raspberrypi:~/src/beast-splitter$ dpkg-buildpackage -b --no-sign
```

生成的 deb 位于上级目录，安装 beast-splitter_3.8.0_armhf.deb 即可。

```
pi@raspberrypi:~/src/beast-splitter$ sudo dpkg --install ../beast-splitter_3.8.0_armhf.deb
```

现在，将 Mode-S Beast 与天线和树莓派连接，启动 beast-spliter。

```
pi@raspberrypi:~/src/beast-splitter$ sudo systemctl start beast-splitter
```

待到绿色指示灯闪烁时，可以看到 /dev 目录多出了一个名为 beast 的设备。

```
pi@raspberrypi:~/src/beast-splitter$ ls /dev
autofs           input               null    serial  tty23  tty44  tty8       vcsa3
beast            kmsg                ppp     shm     tty24  tty45  tty9       vcsa4
block            log                 ptmx    snd     tty25  tty46  ttyAMA0    vcsa5
btrfs-control    loop0               pts     stderr  tty26  tty47  ttyprintk  vcsa6
bus              loop1               ram0    stdin   tty27  tty48  ttyUSB0    vcsm
cachefiles       loop2               ram1    stdout  tty28  tty49  ttyUSB1    vcsm-cma
char             loop3               ram10   tty     tty29  tty5   uhid       vcsu
console          loop4               ram11   tty0    tty3   tty50  uinput     vcsu1
cpu_dma_latency  loop5               ram12   tty1    tty30  tty51  urandom    vcsu2
cuse             loop6               ram13   tty10   tty31  tty52  v4l        vcsu3
disk             loop7               ram14   tty11   tty32  tty53  vchiq      vcsu4
fb0              loop-control        ram15   tty12   tty33  tty54  vcio       vcsu5
fd               mapper              ram2    tty13   tty34  tty55  vc-mem     vcsu6
full             media0              ram3    tty14   tty35  tty56  vcs        vhci
fuse             mem                 ram4    tty15   tty36  tty57  vcs1       video10
gpiochip0        memory_bandwidth    ram5    tty16   tty37  tty58  vcs2       video11
gpiochip1        mmcblk0             ram6    tty17   tty38  tty59  vcs3       video12
gpiochip2        mmcblk0p1           ram7    tty18   tty39  tty6   vcs4       watchdog
gpiochip3        mmcblk0p2           ram8    tty19   tty4   tty60  vcs5       watchdog0
gpiochip4        mqueue              ram9    tty2    tty40  tty61  vcs6       zero
gpiomem          net                 random  tty20   tty41  tty62  vcsa
hwrng            network_latency     raw     tty21   tty42  tty63  vcsa1
initctl          network_throughput  rfkill  tty22   tty43  tty7   vcsa2
```

安装好了 Beast 的驱动，已经成功了一半，接下来是编译打包 bladeRF 和 dump1090-fa。

前面已经提到，dump1090-fa 依赖于 bladeRF，所以先要安装 bladeRF 才能编译 dump1090-fa。

```
pi@raspberrypi:~/src/beast-splitter$ cd ~/src/bladeRF
pi@raspberrypi:~/src/beast-splitter$ git checkout 2017.12-rc1
pi@raspberrypi:~/src/bladeRF$ dpkg-buildpackage -b --no-sign
pi@raspberrypi:~/src/bladeRF$ sudo dpkg --install ../libbladerf1_2017.07_armhf.deb
pi@raspberrypi:~/src/bladeRF$ sudo dpkg --install ../libbladerf-dev_2017.07_armhf.deb
pi@raspberrypi:~/src/bladeRF$ sudo dpkg --install ../libbladerf-udev_2017.07_armhf.deb
```

在安装好 bladeRF 过后，就可以编译 dump1090-fa 了。

```
pi@raspberrypi:~/src/bladeRF$ cd ~/src/dump1090
pi@raspberrypi:~/src/dump1090$ dpkg-buildpackage -b --no-sign
```

由于 dump1090-fa 依赖于 lighttpd 工作，所以安装打包好的 dump1090-fa 之前还要先安装 lighttpd，否则会报错。

```
pi@raspberrypi:~/src/dump1090$ sudo apt install -y lighttpd
```

接下来才是安装 dump1090-fa。

```
pi@raspberrypi:~/src/dump1090$ sudo dpkg --install ~/src/dump1090-fa_3.8.0_armhf.deb
```

最后重启设备。

```
pi@raspberrypi:~/src/dump1090$ sudo reboot
```

重启完毕后，打开 `http://[树莓派 IP]:80/dump1090-fa/` 即可看到实时的 ADS-B 资讯。

# 柒

一切结束了吗？

不。因为 BH4ERB 还要求博主把方法告诉他，然而博主已经不想连上 Teamviewer 远程指导了。

干脆做一个 Docker 镜像吧！

[最后博主将做好的 Docker 镜像 Push 到了 DockerHub。](https://hub.docker.com/repository/docker/bclswl0827/flightfeeder-docker)

除去安装 Docker 的步骤，部署起来只有两步。

 1. 连接 Mode-S Beast；
 2. 部署 Docker 镜像。
```
pi@raspberrypi:~$ sudo docker run -d -i -t \
	--name=FlightFeeder \
	--restart always \
	-p 0.0.0.0:8000:80 \
	--memory="32m" \
	--memory-swap="64m" \
	--oom-kill-disable \
	--privileged \
	bclswl0827/flightfeeder-docker:latest
```

部署成功后，打开 `http://[树莓派 IP]:8000/dump1090-fa/` 即可看到 ADS-B 资讯。

此时，博主真想说一声 Docker YES！

# 捌

好在留了个心眼，才使得博主没有沦为被喝茶的处境。但鉴于博主白嫖了一堆 FlightAware 的设备，对 FlightAware 心存愧疚，最后博主将这块树莓派装上了 PiAware，通过 V2Ray 透明代理为 FlightAware 提供数据。

这也算是符合国情了吧？