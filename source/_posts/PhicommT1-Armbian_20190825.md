---
title: 某科学的 T1 盒子刷 Armbian 调教笔记
date: 2019-08-25 16:22:00
categories: "杂谈"
tags:  [杂谈,瞎搞]
---

在剁手斐讯 N1 刷入 Armbian 作为[本站的 SDR 服务器](https://s.ibcl.us)之后，博主已经对这个“穷人的树莓派”佩服得五体投地了。

然而人的欲望总是无止境的，所以过了几天，博主又在并夕夕上剁手了斐讯 T1 盒子，也打算刷入 Armbian，作为日常实（瞎）验（搞）之用。

可网上一大堆教程都是在调教 N1，有关 T1 刷机的文章少之又少，一切只能自己摸索。

在害怕踩坑并搞烂 T1，导致自己省下的一百五十来块打水漂的情况下，于是博主带着 T1 去附近的庙里烧了香拜了佛......

听上去有些扯，但是博主最后顺利地让 T1 运行了 Armbian，并烧写镜像到了自带的 emmc 中。

这篇文章，便是调教 T1 盒子的笔记。

![T1 盒子](https://cdn-image.ibcl.us/PhicommT1-Armbian_20190825/1.jpg "T1 盒子")

<!--more-->
## 开箱上电

拿到盒子接上电源，迎面而来便是斐讯俗里俗气的开机画面。启动完成后，是第一次使用前的配置向导，接上鼠标，资料一阵乱填，然后... 来到了手机绑定界面...

![绑定手机](https://cdn-image.ibcl.us/PhicommT1-Armbian_20190825/2.jpg "绑定手机")

居然还要绑定手机，博主肯定不会用自己号码绑定的，然而又不能填 Google Voice 的号码，于是，博主填了同桌的电话号码...

按下获取验证码的按钮，博主马上给同桌打了电话。

> **窝：**刚才有个验证码，你收到没得？
> **同桌：**啥子验证码？我啷个没收到诶？
> **窝：**就是那个... 斐讯的验证码耶，没收到啊，你等一哈...

于是博主按下了重新发送验证码。

> **窝：**现在收到了嘛？
> **同桌：**还是没有，恁么晚给窝打电话你是不是有病？

挂断了电话，这时博主意识到斐讯可能已经关闭了注册通道...

难道 T1 就只能吃灰了？

查阅某屎黄色论坛里各位大佬们的发帖，发现原来可以用手机遥控可以跳过注册直接到设置，并打开 ADB。

配套的手机遥控器 APP 在盒子底部便可找到下载二维码。借着这种骚操作，跳过注册步骤直接进入设置，博主顺利地打开了 ADB 功能。

![开启 ADB](https://cdn-image.ibcl.us/PhicommT1-Armbian_20190825/3.png "开启 ADB")

## 系统降级

接下来就是正式的调教了。

实际操作时，博主使用的是 Fedora Linux 系统，至于 Windows 下是否能成功对接 ADB 并进入 Fastboot 模式写入相关降级固件，博主并不清楚（逃。

事先安装了 `android-tools`，找到 T1 的 IP 地址，用 `adb connect` 命令建立连接。此处，博主 T1 分配到的 IP 地址是 `10.10.10.214`。

```
yuki@meow:~$ adb connect 10.10.10.214:5555
```

返回了 Connected to 10.10.10.214:5555 这样的提示，表示连接成功，其他一大堆废话回显就不去管了。

接着，命令 T1 进入 Fastboot 模式。

```
yuki@meow:~$ adb shell reboot fastboot
```

这时，就该供出双公头 USB 数据线了，将数据线的一端~~轻轻地插入 T1 的 USB 小穴中~~，另一端接到电脑的 USB 接口上。

检查 T1 是否已被识别。

```
yuki@meow:~$ fastboot devices
CASDB1154K01740 fastboot # 是设备的序列号
```

[位于本站的文件库，博主已将相关固件上传至此](https://f.ibcl.us/%E6%96%90%E8%AE%AF%E7%9B%92%E5%AD%90%E9%99%8D%E7%BA%A7%E5%9B%BA%E4%BB%B6%E5%92%8C%20dtb%20%E7%AD%89/t1/)。下载 `boot.img`、`bootloader.img`、`recovery.img` 降级固件到本地终端所在目录，然后将他们写入 T1。

```
yuki@meow:~$ fastboot flash boot boot.img
yuki@meow:~$ fastboot flash bootloader bootloader.img
yuki@meow:~$ fastboot flash recovery recovery.img
```

没有报错就说明降级成功了，重启 T1，赋予她新生罢！

```
yuki@meow:~$ fastboot reboot
```

但是重启之后，却发现什么变化都没有。是的，肉体还在，只是灵魂变了。

## 刷入 Armbian

博主从 Armbian 的源码编译了最新的可用于 T1 的 Armbian Buster 镜像，同样的，也于本站的文件库中。

下载镜像并解压得到 .img 文件过后，用 balenaEtcher 将镜像写入 U 盘，写入完成后重新插拔 U 盘，然后可以看到多出了个卷标名为 Boot 的磁盘。

编辑 Boot 卷根目录下的 uEnv.txt，修改 dtb 文件名为 `meson-gxm-q201.dtb`，然后保存。

不过不要先急着插 U 盘到 T1 上面，因为现在需要电脑上执行命令，让 T1 知道下次应该从 U 盘启动。

```
yuki@meow:~$ adb connect 10.10.10.214:5555
yuki@meow:~$ adb shell reboot update
```

考验手速的时候到了，在 T1 原系统画面黑下去的一瞬间，插入 U 盘。

重启了。博主看到了熟悉的 Linux 小企鹅...

Armbian 的默认 root 密码是 1234，系统会要求更改默认密码。

密码更新后，会提示创建一个新的子帐户，先按 Ctrl+C 跳过，稍后创建。

执行 `fdisk -l` 命令，可以看到 emmc 分区。

```
Device         Boot   Start      End  Sectors  Size Id Type
/dev/mmcblk1p1      1368064  1617919   249856  122M  c W95 FAT32 (LBA)
/dev/mmcblk1p2      1619968 30535679 28915712 13.8G 83 Linux
```

现在，可以将系统安装到 emmc 里面了。

```
root@aml:~# ./install-aml.sh
```

写入完成后，用 `poweroff` 命令关机，取下 U 盘，重新上电开机，此时启动的便会是 Debian 了。

## 更换软件源

除了 Debian 的软件源之外，还有 Armbian 自己的软件源，位于 `/etc/sources/sources.list.d/armbian.list`。

由于你国网络具有神奇的特性，上述的两个软件源在使用的时候速度一般不会超过 40 KB/s，如果是第一次更新软件源的话，照这个速度怕是要等上一天。

国内有大学提供了 Debian 和 Armbian 的镜像源，为了节约时间，一定要换源。

方便起见，这里提供已经改好的软件源配置文件，可以用 curl 命令写入 `/etc/apt/sources.list` 和 `/etc/sources/sources.list.d/armbian.list`（需要联网）。

```
root@aml:~# cp /etc/apt/sources.list /etc/apt/sources.list.bak
root@aml:~# cp /etc/apt/sources.list.d/armbian.list /etc/apt/sources.d/armbian.list.bak
root@aml:~# curl https://cdn-static.ibcl.us/PhicommT1-Armbian_20190825/sources.list > /etc/apt/sources.list
root@aml:~# curl https://cdn-static.ibcl.us/PhicommT1-Armbian_20190825/armbian.list > /etc/apt/sources.list.d/armbian.list
```

然后，更新软件源并升级软件源到最新。

```
root@aml:~# apt update && apt upgrade
```

*而在实际操作，执行到 apt upgrade 时，博主却遇到了 Read only filesystem 的报错，最后通过 U 盘引导，在 U 盘下面的 Armbian 系统下执行 `e2fsck /dev/mmcblk1p2` 才得以解决。*

## 安装桌面

完成后，使用 `armbian-config` 命令配置系统，安装桌面。

```
root@aml:~# armbian-config
```

![armbian-config](https://cdn-image.ibcl.us/PhicommT1-Armbian_20190825/4.png "armbian-config")

进入 System 项，然后选择 Default，系统先会引导创建一个子用户，然后下载相关文件并安装完整桌面。

大概 20 分钟之后，桌面就安装好了，这时重启一下系统。

由于 T1 只有一个 USB 口，所以还要接一个 USB Hub，才能容纳键盘和鼠标。推荐使用外部供电的 USB Hub，避免因 T1 电流不够而造成各种各样奇怪的问题。

此外，Armbian 自带浏览器 Chromium，可是总觉得有些不对劲...

![硬件加速开启时](https://cdn-image.ibcl.us/PhicommT1-Armbian_20190825/5.png "硬件加速开启时")

经检查，这是开启了硬件加速才导致的。

![硬件加速关闭时](https://cdn-image.ibcl.us/PhicommT1-Armbian_20190825/6.png "硬件加速关闭时")

前往 [chrome://settings](chrome://settings)，翻到页面最底部，将 Use hardware acceleration when available 取消勾选，重启 Chromium 后即可正常显示。

## 加 Swap

虽说 T1 有八核，但运行内存只有 2GB，看点视频简直卡成 PPT... 忍无可忍，最后又加了 2GB 的 Swap... 由于 Armbian 是采用的 ZRam 作为 Swap 方案，所以增加 Swap 的方式与一般的 Linux 也有所不同。

桌面单击右键，选中 Open Terminal Here，修改 ZRam 的配置文件。

```
yukiho@aml:~/Desktop$ sudo nano /etc/default/armbian-zram-config
```

取消掉 `ZRAM_PERCENTAGE=50` 一行的注释，然后将 `50` 改至 `100`，意为定义 ZRam 大小为物理内存的 100%，保存退出后重启 T1。

在重启过后，执行 free -m，看到 Swap 已经被应用。

开个视频试试看，Swap 用了不少，不过好在终于不卡顿了。

```
yukiho@aml:~/Desktop$ free -m
              total        used        free      shared  buff/cache   available
Mem:           1845         801         725         117         318         798
Swap:          2047         581        1466
```

## 安装中文输入法

操作系统是英文不算是什么大问题，毕竟自己英语学得有那么好（捂脸

可是折腾的时候要打中文啊，所以这时中文输入法成了必不可少的组件。

```
yukiho@aml:~/Desktop$ sudo apt install fcitx fcitx-config-gtk im-config fcitx-data fcitx-pinyin fcitx-ui-light fcitx-ui-classic fcitx-frontend-all fcitx-frontend-gtk2 fcitx-frontend-gtk3 fcitx-frontend-qt4 fcitx-frontend-qt5 fcitx-libs fcitx-module-dbus fcitx-module-x11 fcitx-modules fcitx-pinyin
yukiho@aml:~/Desktop$ im-config -s fcitx -z default
yukiho@aml:~/Desktop$ fcitx
```

然后按下 Ctrl+C，接下来加入 Fcitx 到系统的输入法选项。

```
yukiho@aml:~/Desktop$ fcitx-config-gtk3
```

在弹出的图形页面左下角按下 + 号，并在对话框中取消 Only Show Current Language 复选框，选中 Pinyin 后保存配置并退出。

接着重启，不出意外，状态栏已经出现了一个键盘的标志。恭喜，输入法安装成功了！

使用 Ctrl+Space 切换输入法，然后就可以输入中文了。

![斐讯牛逼惨了](https://cdn-image.ibcl.us/PhicommT1-Armbian_20190825/7.png "斐讯牛逼惨了")

享受输入的乐趣罢！

## 总结

折腾到这里，文章也接进尾声了，总的来说，T1 与 N1 的操作大同小异，只是由于后续的 Armbian 镜像无法识别 emmc 和 Wifi 模块，而较早的镜像又被原作者删除，只能自己编译镜像...

另外， 由于 T1 的体积比 N1 小了不少，也导致了 T1 的发热量很高，对于重庆这种夏天动辄 40 摄氏度的地区还是不太友好...

等到冬天再用罢！

最后，想说的是...

> 我买了台斐讯 T1，我发现这破玩意...

> **牛逼惨了。**