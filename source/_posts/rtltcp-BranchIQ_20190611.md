---
title: 修改 RTL-SDR 驱动使 rtl_tcp 支持从 I/Q 通道直采信号
date: 2019-06-11 13:10:06
categories: "广播"
tags:  [广播,原创,SDR,瞎搞]
---
## 起因

博主最近申请到了 WebSDR 的服务端程序，在准备好各种环境之后，却卡在了与 RTL-SDR 的对接上......

WebSDR 的后端一般与 RTL-SDR 驱动自带的 TCP 服务器模块 `rtl_tcp` 对接并进行调谐。`rtl_tcp` 的启动很简单，只需要一行命令即可解决。

```
root@yukiho:~# rtl_tcp -a 127.0.0.1 -s 1024000 -g 0 -d 0 -p 1234
```

在设置好中心频率（9500 kHz），采样率（1.2 Msps）并启动该模块之后，博主却发现 WebSDR 并不能正常地接收短波信号，频谱瀑布一片空白。

这就很迷了。经过一波分析之后，博主得出了结论：

> `rtl_tcp` 命令不能像 `rtl_sdr` 命令一样使用 I/Q 通道直采接收中短波信号，而此前 OpenWebRX 能实现是因为 Op 采用的是支持 I/Q 通道直采的 `rtl_sdr` 模块加 netcat 转发数据至 TCP 实现的......

转发数据确实是一条新的思路，但是操作起来却有些麻烦：

```
root@yukiho:~# rtl_sdr -D2 -s 1024000 -f 9500000 -p 0 -g 0 -| nmux --bufsize 253952 --bufcnt 379 --port 1234 --address 127.0.0.1
```

此外，由于引入了新的工具 netcat 做数据转发，所以负载也跟着上去了，对于博主的垃圾 Orange Pi Lite 来说简直就是灭顶之灾......

还有更好的方法吗？

<!--more-->

事实上还是有的，通过修改 RTL-SDR 的源码就可以实现 rtl_tcp 支持从 I/Q 通道直采信号。一位国外 HAM SP5TOF 针对 rtl_tcp 模块做了修改，原文是 [Direct Sampling Mode in 820T2 DVB-T on Linux os - SP5TOF - amateur radio station](http://inteligentny-dom.vxm.pl/sp5tof/?page_id=404)。

经过整理后，博主将修改后的 RTL-SDR 驱动上传到了 GitHub......

## 食用方法

事实上，要对 RTL-SDR 进行一次重新编译。

```
root@yukiho:/home# git clone https://github.com/bclswl0827/rtl-sdr.git
root@yukiho:/home# cd rtl-sdr
root@yukiho:/home/rtl-sdr# mkdir build
root@yukiho:/home/rtl-sdr/build# cd build
root@yukiho:/home/rtl-sdr/build# cmake ../ -DINSTALL_UDEV_RULES
root@yukiho:/home/rtl-sdr/build# make
root@yukiho:/home/rtl-sdr/build# make install
root@yukiho:/home/rtl-sdr/build# ldconfig
root@yukiho:/home/rtl-sdr/build# bash -c 'echo -e "\n# for RTL-SDR:\nblacklist dvb_usb_rtl28xxu\n" >> /etc/modprobe.d/blacklist.conf'
root@yukiho:/home/rtl-sdr/build# update-initramfs -u
root@yukiho:/home/rtl-sdr/build# rmmod dvb_usb_rtl28xxu
root@yukiho:/home/rtl-sdr/build# reboot
```

重启系统。

现在，`rtl_tcp` 就可以直接采集来自 I/Q 通道的中短波信号惹～

```
root@yukiho:~# rtl_tcp rtl_tcp -a 127.0.0.1 -s 1024000 -g 0 -d 0 -p 1234 -i 2
```

其中，`-i 2` 意为使用 Q 通道，TCP 端口为 `:1234`，在 `localhost` 下监听。

将配置写入 WebSDR 的配置文件 websdr.cfg，然后运行 WebSDR。

```
...内容保持不变...
band 31 M
device !rtlsdr 127.0.0.1:1234 0
samplerate 1024000
allowwide
centerfreq 9500
initial 9750 am
antenna 20 Metres Wire
gain 0
...内容保持不变...
```

频谱瀑布正常显示，即正常运行，完结撒花。