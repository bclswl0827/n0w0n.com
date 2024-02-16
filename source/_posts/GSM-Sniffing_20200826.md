---
title: 偷窥狂养成记：成本 50 块的 GSM 网络嗅探经历
date: 2020-08-26 01:16:38
categories: "广播"
tags:  [广播,原创,SDR,瞎搞]
---
 - *本文内容仅供参考、学习之用。*
 - *在阅读本文之前，请详细了解相关法律，若因读者对本文内容进行模仿而造成的一切负面影响及后果，[“I BCL.”](https://ibcl.us)一概对其不负责。*
 - *本文内容应情节需求系完全虚构，如有雷同实属巧合。*

# 前情提要

一个百无聊赖的午间，博主正躺在床上带着耳机听歌，昏昏欲睡之中，突然收到一条讯息。

冷气与睡意之间，被通知铃声吵醒是一件痛苦的事，但是博主还是打开了萤幕，原来是某位大佬发来的留言。

> 大佬：最近忙啥呢？

既然是大佬主动联系博主，一定是有什么有趣的事情。

> 博主：表示现在很闲，大佬是有什么事？

接着，大佬发来一个链接，对应的地址是一个[名为 gr-gsm 开源专案](https://github.com/ptrkrysik/gr-gsm)。

> 大佬：既然有时间，咱们来玩嗅探 GSM 怎么样？就用你的 RTL-SDR。

> 博主：蛤？

博主从未想过，自己与成为一个能偷看他人简讯的偷窥狂，仅仅只有 50 块的距离......

这么有趣的体验，怎么能够拒绝？于是博主果断答应了大佬的邀请。

<!--more-->

# 简述

## 裸奔的 GSM

由于各种原因，就算 4G LTE 早已普及，也仍然存在大量 GSM 流量。由于 GSM 信号在中国并未被加密，也就是说，只要有相应的设备，就能捕获到空中的 GSM 信号，轻易地在神不知鬼不觉间解码出一条条的简讯。

所以，即便是在 0202 年的今天，网上也仍然有着不少类似“卡还在，可是钱没了”的新闻。

![卡还在，可是钱没了 --P 民网](https://c.ibcl.us/GSM-Sniffing_20200826/1.jpg "卡还在，可是钱没了 --P 民网")

而事实上，GSM 本身就是一种极不安全的协定，简单来说，其自身的缺陷可以归纳为如下 4 点。

 1. 位置隐私有漏洞：电话在第一次接入网络或是换手（Handover）的情況下，若旧的 VLR（拜访网络）无法正常运作时，新的 VLR 可以要求电话送出 IMSI（用户识别码），以便向 HLR（归属网络）要求认证的资讯。这种情况会暴露电话的真实位置，无法满足隐私需求； 
 2. 电话无法对 VLR 做认证：在通信协定中，我们总是希望能认证对方的身份，以防对方是假冒的，但目前的 GSM 只做到了 VLR 对电话的认证；
 3. 网络主机间不做认证：在 GSM 里，网络主机间是相互信赖的；
 4. 可以使用不加密通信：根据一些国家政府、法律、运营商政策的规定，GSM 可以不加密进行通信。

对于那些利用伪基站进行攻击，然后截获用户简讯骗取钱财的攻击者来说，他们利用的则是上述漏洞的 2、4 点，即先利用干扰设备使被攻击者的电话网络降级到 2G，然后再利用网银等平台的**简讯获取动态密码登入**或是**以简讯验证找回密码**的功能，通过对 GSM 进行嗅探获取到实时验证码，然后登入被攻击者的账户，最后实现转出被攻击者的资金并跑路。

而在本文，博主则将利用上述漏洞的第 4 点，实现对简讯的嗅探，因为在中国，GSM 就是没有加密的。

## 嗅探工具

博主在之前的文章中有提到过不同型号的 RTL-SDR 所能接收的频率范围，所以在此不再赘述。此外，从网络上了解到，中国所使用的 GSM 频率中，GSM 850 和 GSM 900 是包含在大多数的 RTL-SDR 接收范围之内的，对应的频率分别是 850-900 MHz 和 900-999 MHz。其中，GSM 850 是上行数据，GSM 900 是下行数据。

由于上行数据并不好嗅探，所以为了方便起见，本文将以嗅探下行数据（GSM 900）做演示。

天线使用 RTL-SDR 随机所附的天线即可，除了 RTL-SDR 之外，还需要用到一台运行着 Linux 的主机，博主使用的是那台身经百战，运行着 Debian Buster 的斐讯 T1 盒子，事先安装了 LXDE 桌面。

扫描基站频率有多种方案，比如 [IMSI-Catcher](https://github.com/Oros42/IMSI-catcher)、[kalibrate-rtl（用于 RTL-SDR）](https://github.com/steve-m/kalibrate-rtl)、[kalibrate-hackrf（用于 HackRF）](https://github.com/scateu/kalibrate-hackrf)。博主选用的是 kalibrate-rtl。

在扫描完基站频率过后，就要选择一个基站来进行嗅探了，嗅探的工具是 gr-gsm 的 `grgsm_livemon_headless` 模块。嗅探到的 GSM 流量是以数据流的形式传输的，所以还需要用到 Wireshark 来抓包，筛选出有用的资讯。

![全景图](https://c.ibcl.us/GSM-Sniffing_20200826/2.jpg "全景图")

准备好了硬件，综合以上内容，嗅探 GSM 网络需要以下软件。

 - librtlsdr
 - kalibrate-rtl
 - gr-gsm
 - wireshark

# 搭建环境

略去安装 LXDE、更换 APT 镜像源的步骤，由于一些软件需要从源码编译，所以需要准备对应的编译环境。

一并安装需要用到的依赖项。

```
yuki@meow:~$ sudo apt update
yuki@meow:~$ sudo apt install -y cmake libusb-1.0-0-dev build-essential libtool \
  automake autoconf libfftw3-dev pkg-config python-scipy python-docutils \
  libosmocore-dev libboost-all-dev swig doxygen git \
  gnuradio-dev gr-osmosdr libcppunit-dev liblog4cpp5-dev  
```

## librtlsdr

无论是 gr-gsm 的 `grgsm_livemon_headless` 模块还是 kalibrate-rtl 的 `kal` 命令，运行过程中都需要 RTL-SDR 对应的依赖库 librtlsdr 才能运行，而新版的 gr-gsm 需要较新的 librtlsdr 版本，否则会在编译时期报错。不幸的是，部分 Linux 发行版软件仓库中的 librtlsdr 版本过低，所以为了不给后面的操作留坑，从源码编译 librtlsdr 是最保险的做法。

```
yuki@meow:~$ git clone https://github.com/librtlsdr/librtlsdr librtlsdr
yuki@meow:~$ mkdir -p librtlsdr/build
yuki@meow:~$ cd librtlsdr/build
yuki@meow:~/librtlsdr/build$ cmake ../ -DINSTALL_UDEV_RULES=ON -DDETACH_KERNEL_DRIVER=ON
yuki@meow:~/librtlsdr/build$ make -j4
yuki@meow:~/librtlsdr/build$ sudo make install
yuki@meow:~/librtlsdr/build$ sudo ldconfig
yuki@meow:~/librtlsdr/build$ cd ~
```

## kalibrate-rtl

前面已经提到过，kalibrate-rtl 是扫描基站频率的一个工具，由于 Debian 软件仓库中并没有这个软件，所以需要从源码编译安装。

```
yuki@meow:~$ git clone https://github.com/steve-m/kalibrate-rtl.git kalibrate-rtl
yuki@meow:~$ cd kalibrate-rtl
yuki@meow:~/kalibrate-rtl$ ./bootstrap
yuki@meow:~/kalibrate-rtl$ ./configure
yuki@meow:~/kalibrate-rtl$ make -j4
yuki@meow:~/kalibrate-rtl$ sudo make install
yuki@meow:~/kalibrate-rtl$ cd ~
```

## gr-gsm

gr-gsm 是本次嗅探 GSM 网络的主角。虽然一些 Linux 发行版已经将其加入了其测试版的软件仓库中，但是考虑到稳定性以及使用过程中可能会碰到一些玄学问题，从源码编译安装 gr-gsm 仍然是比较好的做法。

```
yuki@meow:~$ git clone https://github.com/ptrkrysik/gr-gsm.git gr-gsm
yuki@meow:~$ mkdir -p gr-gsm/build
yuki@meow:~$ cd gr-gsm/build
yuki@meow:~/gr-gsm/build$ cmake ../
yuki@meow:~/gr-gsm/build$ make -j4
yuki@meow:~/gr-gsm/build$ sudo make install
yuki@meow:~/gr-gsm/build$ sudo ldconfig
yuki@meow:~/gr-gsm/build$ cd ~
```

## Wireshark

需要注意的是，Wireshark 有着两个版本，一个使用较新的 Qt 编写，一个使用传统的 GTK+ 编写。Qt 编写的 Wireshark 包名是 `wireshark`，GTK+ 编写的 Wireshark 包名为 `wireshark-gtk`。

博主起初在安装 Wireshark 时选用是 Qt 编写的版本，但在安装完成后却发现无法运行，于是博主果断将其换成了 GTK+ 编写的 Wireshark。

```
yuki@meow:~$ sudo apt install -y wireshark-gtk
```

如果安装时出现类似 `Should non-superusers be able to capture packets?` 的对话框，使用 Tab 键选择“Yes”后回车即可。若不慎选错，可以在安装结束后使用 dpkg 再次设置，命令如下。

```
yuki@meow:~$ sudo dpkg-reconfigure wireshark-common
```

# 开始搞事

搭建好了嗅探的环境，接下来将 RTL-SDR 插入 USB 口，检查主机是否能识别 RTL-SDR。

```
yuki@meow:~$ lsusb
Bus 004 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub
Bus 002 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
Bus 003 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub
Bus 001 Device 002: ID 0bda:2838 Realtek Semiconductor Corp. RTL2838 DVB-T
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

看到了 RTL2838 DVB-T 的字样，说明一切顺利。

那么，一切可以开始了。

## 寻找基站频率

通过 `kal` 命令，指定 kalibrate-rtl 寻找 GSM 900 频段的基站，并将频率列印在终端上。

```
yuki@meow:~$ kal -s GSM900
Found 1 device(s):
  0:  Generic RTL2832U OEM

Using device 0: Generic RTL2832U OEM
Found Rafael Micro R820T tuner
Exact sample rate is: 270833.002142 Hz
[R82XX] PLL not locked!
kal: Scanning for GSM-900 base stations.
GSM-900:
	chan: 19 (938.8MHz + 42.551kHz)	power: 50485.25
	chan: 24 (939.8MHz + 42.361kHz)	power: 50187.10
	chan: 30 (941.0MHz + 41.515kHz)	power: 145977.48
```

由于博主的 RTL-SDR 没有温度补偿晶振（TXCO），所以偏频比较厉害，但是偏频仍然可以通过手动调节 PPM 来矫正。

由上面列印的数值可以得出，博主的垃圾 RTL-SDR 大概偏了 42 kHz，那么 PPM 值可以设置为 42。

再用 `kal` 命令加上 PPM 参数（-e）扫描一次，争取将偏移的频率控制在 2 kHz 以内，同时记下这个 PPM 值。如果偏移的频率仍然大于 2 kHz，则还需要重复上述操作，调整 PPM 值。

```
yuki@meow:~$ kal -s GSM900 -e 42
Found 1 device(s):
  0:  Generic RTL2832U OEM

Using device 0: Generic RTL2832U OEM
Found Rafael Micro R820T tuner
Exact sample rate is: 270833.002142 Hz
[R82XX] PLL not locked!
kal: Scanning for GSM-900 base stations.
GSM-900:
	chan: 19 (938.8MHz + 1.521kHz)	power: 50485.25
	chan: 24 (939.8MHz + 1.161kHz)	power: 50187.10
	chan: 30 (941.0MHz + 0.515kHz)	power: 145977.48
```

根据功率大小，选择一个频率并记下。博主选择的是 941.0 MHz。一般来说，基站功率越大，数据流越容易捕获。

## 捕获数据流

综合上面的信息，博主打算嗅探的频率是 941.0 MHz，RTL-SDR 的 PPM 为 42，启动 gr-gsm 时也要代入上述参数。

启动 `grgsm_livemon_headless` 过后，可以看到终端上在滚动的字符，这就是基站在传输的数据流。

```
yuki@meow:~$ grgsm_livemon_headless -f 941.0M -p 42
linux; GNU C++ version 7.3.0; Boost_106501; UHD_003.010.003.000-0-unknown

gr-osmosdr 0.1.4 (0.1.4) gnuradio 3.7.11
built-in source types: file osmosdr fcd rtl rtl_tcp uhd miri hackrf bladerf rfspace airspy airspyhf soapy redpitaya freesrp 
Opening nuand bladeRF with the device identifier string: "*:instance=0"
 Serial # e2c2...7a95
 FW v1.9.0 FPGA v0.5.0
Failed ti set out of bound frequency: -399063
Automatic DC correction mode is not implemented.
[INFO @ bladerf.c:773] Clamping bandwidth to 1500000Hz
Using Volk machine:avx_64_mmx
gr::log :INFO controlport - Apache Thrift: -h debian -p 9090
 2d 06 3f 10 0f 20 4f 71 e1 f4 02 00 v1 af 11 ab 2b 2b 2b 2b 2b 2b 2b
 2d 06 3f 10 0f 20 4f 71 e1 f4 02 00 v1 af 11 ab 2b 2b 2b 2b 2b 2b 2b
 2d 06 3f 10 0f 20 4f 71 e1 f4 02 00 v1 af 11 ab 2b 2b 2b 2b 2b 2b 2b
 31 06 3f 00 79 30 25 08 e2 c1 01 01 0f 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b
```

## 成为一个偷窥狂

gr-gsm 输出的数据流谁也看不懂，所以需要用到 Wireshark 对其进行解码，得到明文。

`grgsm_livemon_headless` 除了直接将数据流输出到终端上，也会将的数据流转发到本地回环（lo）的端口，这样就能很轻易用 Wireshark 进行抓包。

另开一个终端，启动 Wireshark。

```
yuki@meow:~$ wireshark-gtk -k -i lo -f 'port 4729'
```

在启动 Wireshark 时，博主遇到了一些报错，但是经过实践后，博主发现这些报错并不会对解码造成影响。

由于基站输出的数据并不全是简讯，所以还需要通过 Wireshark 的筛选功能，将无用的资讯排除掉，只留下简讯。

在 Wireshark 左上角 Filter 一栏输入 `gsm_sms` 即可使 Wireshark 仅输出简讯。

等待了大约 15 分钟过后，博主终于看到了一条广告。

> 【智享"全千兆"】本月必追：《夏日冲浪店》开门营业花式百出，爱奇艺全网独播；《这！就是街舞》第三季燃爆舞台，优酷全网独播；哔哩哔哩《星
> 际迷航》电影13部全系列上线，一键追剧。戳链接 https://dx.10086.cn/profsdwp 立即抢购随心看会员 ，VIP
> 会员与15GB专属追剧流量月月享！

事实上，由于当今使用简讯进行联系的人已经不多，所以博主嗅探到的四分之三的简讯都是来自运营商，银行的通知和各种广告。

可正当博主觉得玩腻了的时候，Wireshark 传来了这样一条简讯。

![沈大哥，我老公在家，不方便给你打电话。](https://c.ibcl.us/GSM-Sniffing_20200826/3.jpg "沈大哥，我老公在家，不方便给你打电话。")

## 遇到的问题

正值七夕，博主不间断地嗅探了一天一夜，最后拿到了上百条简讯，除了一大堆广告之外，其中也不乏有小情侣们互传的情话。

![简讯](https://c.ibcl.us/GSM-Sniffing_20200826/4.jpg "简讯")

但在第二天，Wireshark 就再也不能嗅探到任何简讯了。

在检查了 `grgsm_livemon_headless` 输出的日志过后，博主发现了来自 RTL-SDR 的报错。

```
 15 06 21 00 01 f0 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b
 15 06 21 00 01 f0 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b
 15 06 21 00 01 f0 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b
 15 06 21 00 01 f0 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b 2b
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
cb transfer status: 5, canceling...
rtlsdr_read_async returned with -5
^C
```

就算是重新启动 `grgsm_livemon_headless` 也无济于事。博主怀疑问题出在硬件上。

```
yuki@meow:~$ grgsm_livemon_headless -f 941.0M -p 42
linux; GNU C++ version 7.3.0; Boost_106501; UHD_003.010.003.000-0-unknown

gr-osmosdr 0.1.4 (0.1.4) gnuradio 3.7.11
built-in source types: file osmosdr fcd rtl rtl_tcp uhd miri hackrf bladerf rfspace airspy airspyhf soapy redpitaya freesrp 
Using device #1 Generic RTL2832U OEM
usb_open error -4

FATAL: Failed to open rtlsdr device.

Trying to fill up 1 missing channel(s) with null source(s).
This is being done to prevent the application from crashing
due to gnuradio bug #528.
```

事实上，由于 RTL-SDR 工作时所需电流较大，如果长时间在供电不足的情况下运行，就可能造成 `cb transfer status: 5, canceling...` 的错误，不光是 RTL-SDR，很多 SDR 都是这样。

解决的方法也很简单，只需要将 RTL-SDR 接入带有外接电源的 USB Hub 即可。

# 博主的防嗅探小课堂

从博主的嗅探经历可以看出，虽然博主没有使用干扰设备对附近电话网络进行降级攻击、搭建伪基站等，但仅仅一个 RTL-SDR 亦可见其威力。通过 GSM 嗅探，能够使攻击者处于主动方，而使被攻击者则处于劣势。

同时，资讯安全在大多数人看来，似乎是只要自己不“作”，就不会“翻车”。其实不然，与一般行骗方式不同，受害人不需要点击链接，不需要转发验证码，更不需要主动将验证码之类的敏感资讯转发给任何人。这种攻击一般会选在深夜进行，这就导致了大部分被攻击者都是在早上起床后才发现网银等账户在凌晨被人盗用。

虽然面对这种绕过用户的攻击手段对于普通用户没有绝对有效的方法，如果做好以下防范措施，在一定程度上亦能够防止上述情况发生。

 1. 睡前启用飞航模式：夜间睡前启用飞航模式，使电话不会连到伪基站，基站获取不到电话状态资讯，也就不会将验证码传送到电话，攻击者亦不能获取到电话号码和验证码简讯；
 2. 警惕收讯良好处降级至 2G 网络：由于上述攻击需要借助 2G 网络，故攻击者会先使用干扰设备让电话网络降级到 2G 以拦截通话、简讯和联网数据。所以如果电话在平时收讯良好处突然降级到 2G 网络，就需警惕附近是否有伪基站和 GSM 嗅探；
 3. 开通 VoLTE：VoLTE 能让通话和简讯优先使用 4G 网络，而非 2G 网络；
 4. 隔离电话卡：准备两张电话卡，一张用于日常使用，另一张专门用于注册各种网络平台，接收验证码简讯，在没有使用需求时，将这张卡禁用。

# 尾声

在与大佬分享完这一切过后，博主陷入了沉思。

七夕节，怎么就没人给博主用简讯传情话？
