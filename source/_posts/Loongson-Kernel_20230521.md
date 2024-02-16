---
title: 龙芯 2K1000 EDU 斗智斗勇记
date: 2023-05-21 11:33:11
categories: "Linux"
tags:
  - Linux
  - 龙芯
  - 硬件
  - 嵌入式
---

博主最近在折腾一个地震监测相关的项目，项目中的测站上位机程序需要运行在 Linux 平台上。

由于博主的地震项目需要在异地多点部署测站，要是再从网上采购一堆 Linux 开发板的话，又会是一大笔开销。在翻遍实验室库存过后，博主发现了一堆往届学生参加嵌入式比赛留下的龙芯 2K1000 EDU 板子。

2K1000 EDU 是 mips64el 架构，说来惭愧，博主此前实际用过的 mips 架构的设备，也就只有几台路由器了。

当然，博主相信，这玩意肯定还是比路由器强一点的，不过能强多少，就不好说了。抱着测站程序「能跑就行」的想法，博主取了一块板子，准备上电装系统看看究竟。

本以为 2K1000 EDU 除了架构不太一样，性能比较拉垮一点之外，其他方面同别的 ARM Linux 系列开发板别无两样，结果却出乎博主的意料：本来预计一两个小时就能搞定的事情，在 2K1000 EDU 上折腾了快一天才完成。

所以，这篇文章将详细介绍博主与 2K1000 EDU 斗智斗勇的过程。

![即将寄走的龙芯 2K1000 EDU](https://c.ibcl.us/Loongson-Kernel_20230520/1.jpg)

<!-- more -->

# ISO 在哪里

插上 HDMI 显示器，上电过后却迟迟没有动静，博主怀疑系统是空的，于是开始上网找系统。

找了半天，却发现[龙芯文档](https://mbyzhang.gitbook.io/loongbian/os/loongbian-installation-guide)给出的 Loongbian 的 ISO 下载链接都已经挂了。

![挂掉的链接](https://c.ibcl.us/Loongson-Kernel_20230520/2.png)

最后，博主只能将 ISO 文件名丢进 Google 搜寻，不幸中的万幸，终于找出来了难得能用的一个地址，而且万万没想到的是，系统镜像提供方来自武昌首义学院。

[mirrors.wsyu.edu.cn/loongson/installer/](https://mirrors.wsyu.edu.cn/loongson/installer/)

为了方便后续对系统做客制化，博主最终选择下载了 `loongbian_current_base.iso`。

按照教程给出的方式，使用 `dd` 命令将系统刷入 U 盘后，准备开始安装 Loongbian 系统。

安装一切顺利，也成功进入了系统，可以进一步配置了。

# 升级 Debian 版本

另外，由于 current_base 版本的系统默认不带 sudo 包，所以下面操作要先切换到 root 用户下进行。

透过 su 命令即可切换到 root 身份，密码同样为 loongson。

```shell
$ su root
```

由于 `/etc/apt/sources.list` 中的源地址也挂掉了，所以首先要换源。

Loongbian 实际上源自 Debian Buster，由于要对系统发行版做升级，所以直接将源地址改成 Debian Bullseye 的。

```shell
# echo "deb https://mirrors.bfsu.edu.cn/debian bullseye main" | tee /etc/apt/sources.list
```

再更新软件列表，并对软件做最小升级。

```shell
# apt update
# apt upgrade --without-new-pkgs -y
```

在升级途中可能会有提示是否不询问直接重启服务，勾选 Yes 即可。

完成最小升级后，再进行完全升级。

```shell
# apt full-upgrade -y
```

在完全升级途中，仍然提示是否保留配置文件，一律选择覆盖安装即可。完成完全升级后，重启设备。

```shell
# reboot
```

重启完成后，依然以 root 身份进入系统。

```shell
$ su root
```

同时对系统版本做检查。

```shell
# cat /etc/os-release
PRETTY_NAME="Debian GNU/Linux 11 (bullseye)"
NAME="Debian GNU/Linux"
VERSION_ID="11"
VERSION="11 (bullseye)"
VERSION_CODENAME=bullseye
ID=debian
HOME_URL="https://www.debian.org/"
SUPPORT_URL="https://www.debian.org/support"
BUG_REPORT_URL="https://bugs.debian.org/
```

返回结果中带有 Bullseye 即说明成功。

# 安装常用组件

接下来为龙芯 2K1000 EDU 安装必备及常用组件。

```shell
$ sudo apt install -y openssh-server usbutils network-manager liblinux-usermod-perl build-essential locales bc make dialog network-manager
```

安装完成后，将 loongson 用户加入 sudo 组。

```shell
$ sudo usermod -aG sudo loongson
```

然后再次重启设备。

```shell
$ sudo reboot
```

# 安装无线网卡驱动

由于 2K1000 EDU 板子没有无线网卡，而博主恰好又有使用无线网卡的需求，所以需要先安装无线网卡驱动。

![博主使用的无线网卡](https://c.ibcl.us/Loongson-Kernel_20230520/3.jpg)

这一款 USB 无线网卡使用的芯片方案是 RTL8188GU，所以需要安装驱动。

不幸的是，由于 Loongbian 的源地址挂掉了，所以无法直接安装驱动，只能自己动手交叉编译。

## 准备交叉编译环境

博主使用的交叉编译环境是 Ubuntu 20.04，所以需要先安装交叉编译工具链及搭建交叉编译环境。

先为交叉编译环境换源。

```
$ sudo sed -e "s/archive.ubuntu.com/mirrors.bfsu.edu.cn/g" -e "s/security.ubuntu.com/mirrors.bfsu.edu.cn/g" -i /etc/apt/sources.list
$ sudo apt update
```

然后为交叉编译的环境安装编译内核需要的相关依赖项。

```shell
$ sudo apt install crossbuild-essential-mips64el u-boot-tools git flex bison libncurses-dev bc ssh libssl-dev rsync kmod cpio -y
```

## 交叉编译龙芯内核

在用户根目录下，拉取 Loongbian 所使用的内核源码。

```shell
$ cd ~
$ git clone --depth 1 https://github.com/Loongbian/linux ~/linux
```

由于源码仓库有太多 commits，所以可以加上 `--depth 1` 选项，加快拉取速度。

拉取完成后，进入 linux 目录，然后加载龙芯 2K1000 EDU 配置。

```shell
$ cd ~/linux
$ make ARCH=mips CROSS_COMPILE=/usr/bin/mips64el-linux-gnuabi64- ls2k_defconfig
```

然后运行 menuconfig 开始配置内核参数。

```shell
$ make ARCH=mips CROSS_COMPILE=/usr/bin/mips64el-linux-gnuabi64- menuconfig
```

在弹出的 TUI 界面中，勾选以下选项。

 - 启用 cfg80211 证书义务： Networking support -> Wireless -> cfg80211 certification onus
 - 启用 Realtek USB 无线网卡支援：Device Drivers -> Network device support -> Wireless LAN -> Realtek devices -> Realtek 8187 and 8187B USB support
 - 启用龙芯暂存驱动以支援 GPIO：Device Drivers -> Staging drivers -> Loongson Staging Drivers
 - 启用系统 sysfs 支援：Device Drivers -> GPIO Support -> /sys/class/gpio/... (sysfs interface)
 - 启用 CP210x 串口芯片支援：Device Drivers -> USB support -> USB Serial Converter support -> USB CP210x family of UART Bridge Controllers
 - 启用 CH341 系列串口芯片支援：Device Drivers -> USB support -> USB Serial Converter support -> USB Winchiphead CH341 Single Port Serial Driver
 - 启用 USB Modem 支援：Device Drivers -> USB support -> USB Modem (CDC ACM) support

在完成设定后，多次按下 Esc 键，保存设定并退出，依次运行如下命令进行编译。

```shell
$ make ARCH=mips CROSS_COMPILE=/usr/bin/mips64el-linux-gnuabi64- prepare -j$(nproc)
$ make ARCH=mips CROSS_COMPILE=/usr/bin/mips64el-linux-gnuabi64- scripts -j$(nproc)
$ make ARCH=mips CROSS_COMPILE=/usr/bin/mips64el-linux-gnuabi64- modules -j$(nproc)
```

## 安装龙芯新内核

完成编译后，对内核打包为 .deb 格式，方便在龙芯上安装。

```shell
$ make ARCH=mips CROSS_COMPILE=/usr/bin/mips64el-linux-gnuabi64- bindeb-pkg -j$(nproc)
```

上述命令执行完成后，可以在用户根目录找到打包好的 .deb 文件。

退回到用户根目录，假设龙芯 IP 为 10.0.0.105，使用 scp 命令将 .deb 文件全部上传到龙芯。

```shell
$ cd ~
$ scp ./*.deb loongson@10.0.0.105:/home/loongson
```

然后回到 2K1000 EDU 的终端，安装刚刚上传的内核安装包，安装完成后重启。

**需要注意的是，安装新内核过程中，可能会出现找不到部分驱动的警告，可以将 `https://git.kernel.org/pub/scm/linux/kernel/git/firmware/linux-firmware.git` 仓库 clone 下来，然后在仓库中找到警告中缺失的驱动，将其移动到龙芯的 /lib/firmware 目录下（若没有此目录则需要手动创建），然后再运行 `sudo update-initramfs -u` 即可解决。**

```shell
$ cd ~
$ sudo dpkg -i ./*.deb
$ sudo reboot
```

重启过后，可以使用 `uname -r` 命令查看内核版本，不出意外，内核版本已经更新到了交叉编译的版本。

## 交叉编译 USB 网卡驱动

由于 USB 网卡驱动为内核模块形式，所以还需要对此内核模块做交叉编译。

在交叉编译环境中，回到用户根目录，首先拉取 RTL8188GU 驱动的源码。

```shell
$ git clone --depth 1 https://github.com/McMCCRU/rtl8188gu ~/rtl8188gu
```

拉取完成后，进入 rtl8188gu 目录，然后指定 CPU 架构、交叉编译器、内核源码目录，开始编译。

```shell
$ cd ~/rtl8188gu
$ ARCH=mips CROSS_COMPILE=/usr/bin/mips64el-linux-gnuabi64- make KSRC=~/linux -j$(nproc)
```

编译完成后，将 8188gu.ko 文件上传到龙芯。

```shell
$ scp ./8188gu.ko loongson@10.0.0.150:/home/loongson
```

## 安装 USB 网卡驱动

然后回到 2K1000 EDU 的终端，加载刚刚上传的内核模块。

```shell
$ cd ~
$ sudo insmod ./8188gu.ko
```

不出意外，执行 `sudo ifconfig` 命令后应该能够看到 USB 网卡设备，其前缀一般为 wlx。

然后运行 `sudo nmtui` 命令，在弹出的 TUI 窗口选择 Activate a connection 即可连接 WLAN 网络。

![WLAN 连接成功](https://c.ibcl.us/Loongson-Kernel_20230520/4.png)

# 部署测站程序

好在博主的测站程序是使用 Go 语言编写的，只需要一条命令就能编译出 Mips 平台的程序。

```shell
$ GOOS=linux GOARCH=mipsle GOMIPS=softfloat go build -ldflags="-s -w" main ../cmd/*.go
```

需要注意的是，部分 Mips 平台的内核是没有打开 MIPS FPU Emulator 的，这可能会导致运行时会显示 Illegal instruction，博主考虑到兼容性，所以在编译 Go 程序的时候一律带上了 `GOMIPS=softfloat` 选项。

将程序上传到龙芯，测站程序成功运行。

![测站程序](https://c.ibcl.us/Loongson-Kernel_20230520/5.png)
