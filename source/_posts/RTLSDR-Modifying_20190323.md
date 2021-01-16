---
title: Re：从零开始的 RTL-SDR 折腾记
date: 2019-03-23 13:10:06
categories: "广播"
tags:  [广播,原创,SDR,瞎搞]
---
## 引子

### 起因

最近对 SDR 极感兴趣，于是先后剁手了 SDRPlay、RTL-SDR、Mini-Whip 等设备。闷声发大财当然没有意思，好东西还是要分享出来，于是博主又剁手了一台 Orange Pi Lite，决定搭建一个 SDR 站点。

经过三个小时的折腾，终于成功了，于是有了现在的 [s.ibcl.us](https://s.ibcl.us)。

这篇文章，记录了博主从零搭建 SDR 站点的全部过程，并分享了自己的一些经验。

<!--more-->

### 情况

GitHub 上的一个名为 OpenWebRX 的项目便提供了搭建 Web 页面 SDR 的解决方案。该项目基于 Python 编写，除了完全开源外，官方也提供了完备的技术文档，在某些方面甚至超越了 WebSDR。

### 方案

去年黑五时没忍住诱惑，在 Virmach 剁手了一台年付 20 刀的 VPS，很栽的是，博主被分到的是一个被 TCP 阻断的 IP，此后便一直吃灰。此次折腾，说不定可以救活这台 VPS......

此地的垃圾电信在去年 10 月底回收了博主家的公网 IP，然后偷偷换成了大内网... 在多次打电话要求还回 IP 之后无果，现在只能依赖于内网穿透。

当然，博主肯定不会去用“花生壳”这一类的坑逼软件。博主的想法是，在吃灰的 VPS 上安装 Frps，然后在需映射机上用 Kcp 与 VPS 建立连接。这样不但回避了 TCP 连接，还可以对抗恶劣的网络环境。

为了隐藏 VPS 的 IP 地址保证安全，博主决定使用 CDN 进行加速保护。可是 CDN 流量也要钱的啊，为了节约成本，就只能使用 CloudFlare 了。正好， CloudFlare 也支持 WebSocket 连接。

由于 VPS 已经安装了 Nginx 并占用了 80/443 端口，且 CouldFlare 免费套餐不能中继除 80/443 以外的端口，所以博主决定使用 Nginx 反向代理 Frps 映射的 OpenWebRX 页面到 80 端口。

RTL-SDR 方面，可以通过改装 Q 通道让 RTL2832U 接收短波信号，天线选用长电线加 9:1 巴伦，然后将信号直接输入 RTL2832U。

下面是用 Mermaid 绘制的一张流程图，以供参考。

```mermaid
graph LR
A(天线) -- 巴伦 --> B(RTL-SDR)
B -- USB --> C(Orange Pi Lite)
C -- Frpc Kcp 模式 --> D(VPS Frps 8073 端口)
D -- Nginx 反向代理 --> E(VPS Nginx 80 端口)
E -- CloudFlare CDN --> F(用户)
```

### 适用对象

博主此次一心想要搭建一个与其他人不一样的 OpenWebRX 站点，故，本文重点主要是在 Linux 及 CDN 上的操作。如果您对 Linux 不太熟悉，那么请酌情参考此教程后半部分的内容。

 - 适用对象：女装大佬、Linux 狂热者、折腾帝、抠脚大汉......
 - 不适用对象：小白、小学生、妹子......
 - 对了，那位名叫沈厚任的大佬，这篇文章同样不适合您......

前面扯了这么多，那么下面就正式开始吧！

## RTL-SDR

### 芯片与灵敏度

只是一个普通的 RTL-SDR 而已，所以灵敏度肯定好不到哪里去，就不要期望有什么奇迹发生了......

网络上所售卖的 RTL-SDR，其价格一般在 CNY 20-100+ 不等，博主所购买的是 CNY 42（不含运费）的那一款，其芯片是 RTL2832U+R820T2。

![RTL-SDR](https://c.ibcl.us/RTLSDR-Modifying_20190323/1.jpg "RTL-SDR")

至于 CNY 20 就能买到的 RTL-SDR，其芯片采用的是 RTL2832U+FC0013，如果不进行改装，其效果奇差，不建议购买。

下面是从网上抄来的一份表格，内容是 RTL-SDR 所采用的几种常见的芯片方案。

| 芯片方案 | 频率范围 | 情况 | 
| :------- | :------- | :--- | 
| RTL2832U+E4000 | 54-2200 MHz | 已停产 |
| RTL2832U+R820T | 24-1766 MHz | 最容易取得 |
| RTL2832U+R820T2 | 24-1766 MHz | 接收能力最强 |
| RTL2832U+FC0013 | 22-1100 MHz | 灵敏度最差 |
| RTL2832U+FC0012 | 22-948 MHz | 未知 |

当然，网上也有已经改装好的 RTL-SDR，其方案采用的是 RTL2832U+R820T2，但是由于价格太贵，所以并不建议有改装能力的人购买。

### 改造 Q 通道接收短波

 1. 拆开 RTL-SDR 塑料外壳，让 RTL2832U 的标志正对自己，从左往右数，RTL2832U 的第四根针脚即为 Q 通道；
 2. 找一根细铜丝，用电烙铁在 Q 通道处焊上即可，然后用双面胶将细铜丝固定住，以免断开；
 3. 将细铜丝接到巴伦上；
 4. 改装成功。

看起来好像很简单的样子，实际上，您需要注意这些细节：

 1. 新版的RTL-SDR 已经预留好了 Q 通道的焊盘，所以没有必要白费力气拿放大镜去找针脚；
 2. 其实 RTL2832U 挺不经折腾的，为了防止烙铁焊针带电，建议将烙铁烧热后断电再操作。

对应的，附上图片，左边的焊盘对应第四根针脚，即 Q+。

![左部焊盘为 Q+](https://c.ibcl.us/RTLSDR-Modifying_20190323/2.jpg "左部焊盘为 Q+")

![焊于左部焊盘](https://c.ibcl.us/RTLSDR-Modifying_20190323/3.jpg "焊于左部焊盘")

![盖上盖子](https://c.ibcl.us/RTLSDR-Modifying_20190323/4.jpg "盖上盖子")

### 绕制巴伦

前面有提到巴伦，这是使用长线做天线接收短波时必不可少的一个物件。

网上也有零售 9：1 巴伦，但是博主不想再等了，所以打算自己绕制一个。不过效果可能不如成品好......

所使用的材料，在普通的电子整流器中就可以找到，如图。

![电子整流器](https://c.ibcl.us/RTLSDR-Modifying_20190323/5.jpg "电子整流器")

其实仅仅那一堆漆包线和一个磁环就够了，有点杀鸡取卵的味道。

![漆包线](https://c.ibcl.us/RTLSDR-Modifying_20190323/6.jpg "漆包线")

![磁环](https://c.ibcl.us/RTLSDR-Modifying_20190323/7.jpg "磁环")

贴出对应图纸。

![图纸](https://c.ibcl.us/RTLSDR-Modifying_20190323/8.jpg "图纸")

为了防止绕制过程中混淆了漆包线之间的对应关系，建议在对应的线头做上相应记号。

看看博主的半成品，献丑了......

![博主的作品](https://c.ibcl.us/RTLSDR-Modifying_20190323/9.jpg "博主的作品")

### Mini Whip 值不值

绕巴伦好麻烦，还不如买一个现成短波天线，但是一般的短波天线都太庞大，不便于在居民楼内使用。有什么好的天线方案呢？

或许 Mini Whip 是一个不错的方案。Mini Whip 是一款小巧的有源天线，从市场的评价来看，Mini Whip 好评如潮。唯一不足的是，该天线需要 12V 以上的直流供电才能运行。

现在博主也有一个，将其挂在窗户上，可以获得比使用拉杆天线好数倍的效果，尤其对于弱电台有很好的放大作用，但是在放大信号的同时，也放大了博主房间内的交流干扰。

从总体上来说，Mini Whip 还是很优秀的，值得一试。

## 开发板

### 优势何在

比起笨重的 PC，使用开发板可以节省不少的空间，另外，从功率、能耗的角度来看，开发板明显要比 PC 更胜一筹。另外，开发板在运行过程中所产生的噪音也比 PC 少得多得多。

### 预算与选择

如果预算充足，Raspberry Pi 2、Raspberry Pi 3 无疑是最佳选择，只可惜博主口袋里没这么厚的一沓钞票（笑），只好作罢，转而选择比 Raspberry Pi 便宜得多的 Orange Pi。

~~在廉价两位数的诱惑之下，博主买了 Orange Pi Lite......~~

![Orange Pi Lite](https://c.ibcl.us/RTLSDR-Modifying_20190323/10.jpg "Orange Pi Lite")

### Debian 大法好

Orange Pi 官方提供的系统实在不靠谱，遂打算使用 [Armbian](https://www.armbian.com/orange-pi-lite/)。然后，博主选择了 Armbian Stretch，这是 Armbian 为 Orange Pi Lite 重新编译的 Debian 轻量版。

下载完成之后，使用 [balenaEtcher](https://www.balena.io/etcher/) 将系统烧录到 SD 卡中，切勿使用软碟通一类的工具烧录。然后，插入 SD 卡到 Orange Pi Lite 的 SD 卡槽，接上 HDMI 后通电，初始化完成后，用户名输入 `root`，密码输入 `1234`，进入系统，随后会提示更新密码。

密码更新之后，系统会引导创建一个新用户，博主懒得创建，直接按 `Ctrl+C` 跳过，又不是 VPS，就不必这么麻烦了。

### 连 Wifi

很栽的是，Orange Pi Lite 居然没有提供 LAN 口，只有通过 Wifi 连接网络。

好在新版的 Armbian 提供了方便的 Wifi 连接方案，只需运行命令 `armbian-config` 即可设置。

在命令行输入 `armbian-config`，由于没有连接网络，所以会出现一个警告，直接 Enter 确认，随即来到一个伪图形化的界面。

```
root@yukiho:~# armbian-config
```

用键盘上下键选择，进入 Network，看到有 Wifi 字样的选项，选中进入，随后系统会扫描 SSID，然后将所有无线网列出。

用上下键选中要连接到的 SSID，然后输入密码即可连接。

按下 Esc 键退出 SSID 列表，博主想要给 Orange Pi 分配一个固定的内网 IP，于是，在刚刚的 Network 菜单中选择 IP 一项，Address 和 Netmask 填入相应内容，光标移动到 OK 并保存。

完成操作后，再连续按下 Esc 退出 armbian-config，使用 `ping` 命令，测试网络是否连通。

```
root@yukiho:~# ping bing.com
PING bing.com (204.79.197.200) 56(84) bytes of data.
64 bytes from a-0001.a-msedge.net (204.79.197.200): icmp_seq=1 ttl=114 time=51.8 ms
64 bytes from a-0001.a-msedge.net (204.79.197.200): icmp_seq=2 ttl=114 time=47.7 ms
64 bytes from a-0001.a-msedge.net (204.79.197.200): icmp_seq=3 ttl=114 time=52.7 ms
^C
--- bing.com ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 47.717/50.777/52.738/2.192 ms
```

得到回应，按下 `Ctrl+C` 停止 Ping，可以确定，已经连上网络了。

通过这种方法配置的网络，在重启或掉线之后也会自动尝试再次连接。

那么重启看看是不是已经连网了呢？

```
root@yukiho:~# reboot
```

在路由器管理页中开放了开发板的 22 端口后，接下来便是通过 SSH 与开发板连接，而不再使用 HDMI。

### NAT 穿透

#### VPS 上的操作

前往 [https://github.com/fatedier/frp/releases](https://github.com/fatedier/frp/releases) 获取最新版本的 Frps。对于 VPS，如果不是安装的 32 位的操作系统，就下载 `amd64` 架构的版本，解压后将二进制文件 `frps` 和配置文件 `frps.ini` 用 WinSCP 上传到 VPS，前面提到过，VPS 已被 TCP 阻断，所以这里要挂上梯子。

先修改 `frps.ini`，用 Notepad++ 打开，博主的配置文件内容如下。
```
[common]
bind_addr = 0.0.0.0
bind_port = 3000
kcp_bind_port = 3000
token = ibcl.us
authentication_timeout = 0
```

保存，然后在 VPS 新建 `/usr/local/frps` 目录，一并将 `frps`、`frps.ini` 上传至该目录下，并为 `frps` 赋予 `755` 权限。

为了方便控制 frps 的启动与停止，博主写了一个控制 `frps` 的 `Shell` 脚本，

```
#! /bin/bash
# chkconfig: 2345 55 25
# Description: Startup script for frps on Debian. Place in /etc/init.d and
# run 'update-rc.d -f frps defaults', or use the appropriate command on your
# distro. For CentOS/Redhat run: 'chkconfig --add frps'
#=============================================================
#   System Required:  CentOS/Debian/Ubuntu (32bit/64bit)
#   Description:  Manager for frps, Written by Yukiho Kikuchi.
#   Author: Yukiho Kikuchi
#=============================================================
### BEGIN INIT INFO
# Provides:          frps
# Provides:          frps
# Required-Start:    $all
# Required-Stop:     $all
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: starts the frps
# Description:       starts frps using start-stop
### END INIT INFO

PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
ProgramName="Frps"
ProgramPath="/usr/local/frps"
NAME=frps
BIN=${ProgramPath}/${NAME}
CONFIGFILE=${ProgramPath}/frps.ini
SCRIPTNAME=/etc/init.d/${NAME}
version="1.0"
program_version=`${BIN} --version`
RET_VAL=0

[ -x ${BIN} ] || exit 0
strLog=""
fun_clangcn()
{
    echo ""
    echo "+--------------------------------------------------------+"
    echo "| Manager for ${ProgramName}, Written by Yukiho Kikuchi. |"
    echo "+--------------------------------------------------------+"
    echo ""
}

fun_check_run(){
    PID=`ps -ef | grep -v grep | grep -i "${BIN}" | awk '{print $2}'`
    if [ ! -z $PID ]; then
        return 0
    else
        return 1
    fi
}
fun_load_config(){
    if [ ! -r ${CONFIGFILE} ]; then
        echo "config file ${CONFIGFILE} not found"
        return 1
    fi
}
fun_start()
{
    if [ "${arg1}" = "start" ]; then
      fun_clangcn
    fi
    if fun_check_run; then
        echo "${ProgramName} (pid $PID) already running."
        return 0
    fi
    fun_load_config
    echo -n "Starting ${ProgramName}(${program_version})..."
    ${BIN} -c ${CONFIGFILE} >/dev/null 2>&1 &
    sleep 1
    if ! fun_check_run; then
        echo "start failed"
        return 1
    fi
    echo " done"
    echo "${ProgramName} (pid $PID)is running."
    return 0
}

fun_stop(){
    if [ "${arg1}" = "stop" ] || [ "${arg1}" = "restart" ]; then
      fun_clangcn
    fi
    if fun_check_run; then
        echo -n "Stoping ${ProgramName} (pid $PID)... "
        kill $PID
        if [ "$?" != 0 ] ; then
            echo " failed"
            return 1
        else
            echo " done"
        fi
    else
        echo "${ProgramName} is not running."
    fi
    return 0
}
fun_restart(){
    fun_stop
    fun_start
}
fun_status(){
    PID=`ps -ef | grep -v grep | grep -i "${BIN}" | awk '{print $2}'`
    if [ ! -z $PID ]; then
        echo "${ProgramName} (pid $PID) is running..."
    else
        echo "${ProgramName} is stopped"
        exit 0
    fi
}
checkos(){
    if grep -Eqi "CentOS" /etc/issue || grep -Eq "CentOS" /etc/*-release; then
        OS=CentOS
    elif grep -Eqi "Debian" /etc/issue || grep -Eq "Debian" /etc/*-release; then
        OS=Debian
    elif grep -Eqi "Ubuntu" /etc/issue || grep -Eq "Ubuntu" /etc/*-release; then
        OS=Ubuntu
    elif grep -Eqi "Alpine" /etc/issue || grep -Eq "Alpine" /etc/*-release; then
        OS=Alpine
    else
        echo "Not support OS, Please reinstall OS and retry!"
        return 1
    fi
}
fun_config(){
    if [ -s ${CONFIGFILE} ]; then
        vi ${CONFIGFILE}
    else
        echo "${ProgramName} configuration file not found!"
        return 1
    fi
}
fun_version(){
    echo "${ProgramName} version ${program_version}"
    return 0
}
fun_help(){
    ${BIN} --help
    return 0
}

arg1=$1
[  -z ${arg1} ]
case "${arg1}" in
    start|stop|restart|status|config)
        fun_${arg1}
    ;;
    [vV][eE][rR][sS][iI][oO][nN]|-[vV][eE][rR][sS][iI][oO][nN]|--[vV][eE][rR][sS][iI][oO][nN]|-[vV]|--[vV])
        fun_version
    ;;
    [Cc]|[Cc][Oo][Nn][Ff]|[Cc][Oo][Nn][Ff][Ii][Gg]|-[Cc]|-[Cc][Oo][Nn][Ff]|-[Cc][Oo][Nn][Ff][Ii][Gg]|--[Cc]|--[Cc][Oo][Nn][Ff]|--[Cc][Oo][Nn][Ff][Ii][Gg])
        fun_config
    ;;
    [Hh]|[Hh][Ee][Ll][Pp]|-[Hh]|-[Hh][Ee][Ll][Pp]|--[Hh]|--[Hh][Ee][Ll][Pp])
        fun_help
    ;;
    *)
        fun_clangcn
        echo "Usage: $SCRIPTNAME {start|stop|restart|status|config|version}"
        RET_VAL=1
    ;;
esac
exit $RET_VAL
```

复制到 Notepad++，换行符选用 `UNIX (LF)`，保存文件为 `frps` 并上传至 VPS 的 `/etc/init.d` 目录下，赋予 `755` 权限。

然后，将其加入 VPS 的开机启动项。

```
root@yukiho-vps:~# cd /etc
root@yukiho-vps:/etc# vi rc.local
```

```
#!/bin/sh -e
#
# rc.local
#
# This script is executed at the end of each multiuser runlevel.
# Make sure that the script will "exit 0" on success or any other
# value on error.
#
# In order to enable or disable this script just change the execution
# bits.
#
# By default this script does nothing.

/etc/init.d/frps start

exit 0
```

*几天前才把 `init.d` 批判了一番，今天却还用 `init.d` 来控制进程，真香(*/ω＼*)。*

#### 开发板上的操作

与 VPS 的操作大致相同，只不过 `frps` 变成了 `frpc`。

附上博主的配置文件 `frpc.ini`：

```
[common]
server_addr = example.org
server_port = 3000
token = ibcl.us
tcp_mux = true
login_fail_exit = false
protocol = kcp
[RTL-SDR]
type = tcp
local_ip = 127.0.0.1
local_port = 80
use_encryption = true
use_compression = true
remote_port = 8073
```

`server_addr`、`token`、`server_port` 等请根据真实情况自行修改。此外，博主打算让 OpenWebRX 使用开发板的 80 端口。

然后，贴出 `frpc` 的控制脚本。

```
#! /bin/bash
# chkconfig: 2345 55 25
# Description: Startup script for frpc on Debian. Place in /etc/init.d and
# run 'update-rc.d -f frpc defaults', or use the appropriate command on your
# distro. For CentOS/Redhat run: 'chkconfig --add frpc'
#=============================================================
#   System Required:  CentOS/Debian/Ubuntu (32bit/64bit)
#   Description:  Manager for frps, Written by Yukiho Kikuchi.
#   Author: Yukiho Kikuchi
#=============================================================
### BEGIN INIT INFO
# Provides:          frps
# Provides:          frps
# Required-Start:    $all
# Required-Stop:     $all
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: starts the frps
# Description:       starts frps using start-stop
### END INIT INFO

PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
ProgramName="Frpc"
ProgramPath="/usr/local/frpc"
NAME=frpc
BIN=${ProgramPath}/${NAME}
CONFIGFILE=${ProgramPath}/frpc.ini
SCRIPTNAME=/etc/init.d/${NAME}
version="1.0"
program_version=`${BIN} --version`
RET_VAL=0

[ -x ${BIN} ] || exit 0
strLog=""
fun_clangcn()
{
    echo ""
    echo "+--------------------------------------------------------+"
    echo "| Manager for ${ProgramName}, Written by Yukiho Kikuchi. |"
    echo "+--------------------------------------------------------+"
    echo ""
}

fun_check_run(){
    PID=`ps -ef | grep -v grep | grep -i "${BIN}" | awk '{print $2}'`
    if [ ! -z $PID ]; then
        return 0
    else
        return 1
    fi
}
fun_load_config(){
    if [ ! -r ${CONFIGFILE} ]; then
        echo "config file ${CONFIGFILE} not found"
        return 1
    fi
}
fun_start()
{
    if [ "${arg1}" = "start" ]; then
      fun_clangcn
    fi
    if fun_check_run; then
        echo "${ProgramName} (pid $PID) already running."
        return 0
    fi
    fun_load_config
    echo -n "Starting ${ProgramName}(${program_version})..."
    ${BIN} -c ${CONFIGFILE} >/dev/null 2>&1 &
    sleep 1
    if ! fun_check_run; then
        echo "start failed"
        return 1
    fi
    echo " done"
    echo "${ProgramName} (pid $PID)is running."
    return 0
}

fun_stop(){
    if [ "${arg1}" = "stop" ] || [ "${arg1}" = "restart" ]; then
      fun_clangcn
    fi
    if fun_check_run; then
        echo -n "Stoping ${ProgramName} (pid $PID)... "
        kill $PID
        if [ "$?" != 0 ] ; then
            echo " failed"
            return 1
        else
            echo " done"
        fi
    else
        echo "${ProgramName} is not running."
    fi
    return 0
}
fun_restart(){
    fun_stop
    fun_start
}
fun_status(){
    PID=`ps -ef | grep -v grep | grep -i "${BIN}" | awk '{print $2}'`
    if [ ! -z $PID ]; then
        echo "${ProgramName} (pid $PID) is running..."
    else
        echo "${ProgramName} is stopped"
        exit 0
    fi
}
checkos(){
    if grep -Eqi "CentOS" /etc/issue || grep -Eq "CentOS" /etc/*-release; then
        OS=CentOS
    elif grep -Eqi "Debian" /etc/issue || grep -Eq "Debian" /etc/*-release; then
        OS=Debian
    elif grep -Eqi "Ubuntu" /etc/issue || grep -Eq "Ubuntu" /etc/*-release; then
        OS=Ubuntu
    elif grep -Eqi "Alpine" /etc/issue || grep -Eq "Alpine" /etc/*-release; then
        OS=Alpine
    else
        echo "Not support OS, Please reinstall OS and retry!"
        return 1
    fi
}
fun_config(){
    if [ -s ${CONFIGFILE} ]; then
        vi ${CONFIGFILE}
    else
        echo "${ProgramName} configuration file not found!"
        return 1
    fi
}
fun_version(){
    echo "${ProgramName} version ${program_version}"
    return 0
}
fun_help(){
    ${BIN} --help
    return 0
}

arg1=$1
[  -z ${arg1} ]
case "${arg1}" in
    start|stop|restart|status|config)
        fun_${arg1}
    ;;
    [vV][eE][rR][sS][iI][oO][nN]|-[vV][eE][rR][sS][iI][oO][nN]|--[vV][eE][rR][sS][iI][oO][nN]|-[vV]|--[vV])
        fun_version
    ;;
    [Cc]|[Cc][Oo][Nn][Ff]|[Cc][Oo][Nn][Ff][Ii][Gg]|-[Cc]|-[Cc][Oo][Nn][Ff]|-[Cc][Oo][Nn][Ff][Ii][Gg]|--[Cc]|--[Cc][Oo][Nn][Ff]|--[Cc][Oo][Nn][Ff][Ii][Gg])
        fun_config
    ;;
    [Hh]|[Hh][Ee][Ll][Pp]|-[Hh]|-[Hh][Ee][Ll][Pp]|--[Hh]|--[Hh][Ee][Ll][Pp])
        fun_help
    ;;
    *)
        fun_clangcn
        echo "Usage: $SCRIPTNAME {start|stop|restart|status|config|version}"
        RET_VAL=1
    ;;
esac
exit $RET_VAL
```

同样的，复制到 Notepad++，换行符选用 `UNIX (LF)`，保存文件为 `frpc` 并上传至开发板的 `/etc/init.d` 目录下，赋予 `755` 权限。

加入到开机启动项。

```
root@yukiho-vps:~# cd /etc
root@yukiho-vps:/etc# vi rc.local
```

```
#!/bin/sh -e
#
# rc.local
#
# This script is executed at the end of each multiuser runlevel.
# Make sure that the script will "exit 0" on success or any other
# value on error.
#
# In order to enable or disable this script just change the execution
# bits.
#
# By default this script does nothing.

/etc/init.d/frpc start

exit 0
```

## 环境搭建

### 一键脚本

对 OpenWebRX 爱得深沉，所以写了一个一键脚本（笑）......

*补充：使用 PHICOMM N1 等 ARMv8 架构的设备，一键脚本不可用，请使用手动安装。*

![说到一键脚本，有些想笑...](https://c.ibcl.us/RTLSDR-Modifying_20190323/11.gif "说到一键脚本，有些想笑...")

```
root@yukiho:/home# curl https://raw.githubusercontent.com/bclswl0827/openwebrx-installer/master/rtl-sdr_installer.sh | bash
```

然后，RTL-SDR 之驱动和 OpenWebRX 会安装在您当前的目录下，博主安装在了 `/home` 下。

### 手动安装

> 要是有个妹子在旁边看着俺操作，俺一定会选手动安装的。

那么，下面来介绍手动安装 OpenWenRX。

安装编译时必要的包。

```
root@yukiho:~# apt install build-essential git libfftw3-dev cmake libusb-1.0-0-dev -y
```

拉取 RTL-SDR 之驱动源码并编译。

```
root@yukiho:/home# git clone https://github.com/keenerd/rtl-sdr.git
root@yukiho:/home# cd rtl-sdr
root@yukiho:/home/rtl-sdr# mkdir build
root@yukiho:/home/rtl-sdr# cd build
root@yukiho:/home/rtl-sdr/build# cmake ../ -DDETACH_KERNEL_DRIVER=ON -DINSTALL_UDEV_RULES=ON
root@yukiho:/home/rtl-sdr/build# make
root@yukiho:/home/rtl-sdr/build# make install
root@yukiho:/home/rtl-sdr/build# ldconfig
root@yukiho:/home/rtl-sdr/build# cd /home
```

然后拉取 OpenWebRX 及其依赖项 csdr 的源码，并编译 csdr。

针对 ARMv8 等设备编译 csdr，请参考博主关于 OpenWebRX 的另一篇文章：[《在 ARMv8 架构设备上编译 csdr》](https://ibcl.us/ARMv8-csdr_20190729/)。

```
root@yukiho:/home# git clone https://github.com/simonyiszk/openwebrx.git
root@yukiho:/home# git clone https://github.com/jketterl/csdr
root@yukiho:/home# cd csdr
root@yukiho:/home/csdr# git checkout 32958ce37eb765f7f5511fe5f7c2c244c13f264b
root@yukiho:/home/csdr# make
root@yukiho:/home/csdr# make install
root@yukiho:/home/csdr# cd /home
```

某些内核模块会锁定 USB 设备，需要在使用 SDR 设备之前将其禁用。

如果内核模块未正确列入黑名单，则可能会出现 Device not found 的错误。

```
root@yukiho:/home# bash -c 'echo -e "\n# for RTL-SDR:\nblacklist dvb_usb_rtl28xxu\n" >> /etc/modprobe.d/blacklist.conf'
root@yukiho:/home# update-initramfs -u
root@yukiho:/home# rmmod dvb_usb_rtl28xxu
```

然后，安装完成。

值得一提的是，在执行第三条命令时报错属正常现象。

### 配置文件

贴出博主的配置文件，该配置文件中已经设置了使用 Q 通道进行直采，并附上了相关中文注释。

```
# -*- coding: utf-8 -*-
web_port=80 # 使用端口，博主在此使用 :80
server_hostname="s.ibcl.us" # 主机名
max_clients=5 # 使用人数上限
receiver_name="SDR | I BCL." # 接收机名称
receiver_location="Kaizhou, Chungking, China" # 地点
receiver_qra="OM41ee" # QTH 定位 http://www.levinecentral.com/ham/grid_square.php
receiver_asl=200 # 天线海平面高度
receiver_ant="20 Metres Wire" # 天线种类
receiver_device="RTL-SDR" # 设备
receiver_admin="bclswl0827@yahoo.co.jp" # 管理者邮箱
receiver_gps=(31.177417, 108.398250) # Google 地图坐标
photo_height=350 # 背景图高度（px）
photo_title="Hanfeng Lake of Twilight, Kaizhou." # 背景图标题
photo_desc="""
This is Hanfeng Lake, in Kaizhou, Chungking, China.<br />
It's where my receiver be located.<br />
Please contact me by the following e-mail: <a href="mailto:%[RX_ADMIN]">%[RX_ADMIN]</a><br/>
Device: %[RX_DEVICE]<br />
Antenna: %[RX_ANT]<br />
Welcome to visit my blog: <a href="https://ibcl.us" target="_blank">https://ibcl.us</a>
""" # 站点介绍
sdrhu_key = "" # SDR.hu 列出设备之 API Key
sdrhu_public_listing = False
fft_fps=3 # 瀑布帧率
fft_size=4096 # 瀑布大小，大于等于 2048
fft_voverlap_factor=0.1 # 瀑布重叠系数
samp_rate = 2048000 # 采样率
center_freq = 9500000 # 中心频率，频率范围为“中心频率±（采样率/2）”
rf_gain = 0 # 增益，以 dB 为单位，RTL-SDR 设置成 0 为自动模式
ppm = -9 # 偏频纠正，负值为左移瀑布，正值为右移瀑布，需要自行调试
audio_compression="adpcm" # 可用值：“adpcm”、“none”
fft_compression="adpcm" # 可用值：“adpcm”、“none”
digimodes_enable=True # 解码 Digimodes 会占用更高的 CPU
digimodes_fft_size=2048 # Digimodes 之瀑布大小
start_rtl_thread=True # 启用 RTL 线程
"""
注意：当 CPU 使用率高达 100％ 时会遇到音频欠载，您可以：
 - 减少 `samp_rate` 的值；
 - 将 `fft_voverlap_factor` 设置为 0；
 - 减少 `fft_fps` 和 `fft_size` 的值；
 - 通过减少 `max_clients` 来限制最大用户数量。
"""
start_rtl_command="rtl_sdr -D2 -s {samp_rate} -f {center_freq} -p {ppm} -g {rf_gain} -".format(rf_gain=rf_gain, center_freq=center_freq, samp_rate=samp_rate, ppm=ppm) # RTL-SDR 启动命令
format_conversion="csdr convert_u8_f" # 转换格式
shown_center_freq = center_freq # 使用上变频器时可以更改此设定
client_audio_buffer_size = 8 # 音频缓冲大小，通过改大数值以减少音频欠载的次数，但同时会增加延迟
start_freq = 9750000 # 起始频率
start_mod = "am" # 可用值：“nfm”、“am”、“lsb”、“usb”、“cw”
iq_server_port = 4951 # 用于监听 netcat 的 TCP 端口。I/Q 数据由此发送，并供 OpenWebRX 使用。默认情况下，只对 127.0.0.1 开放
#access_log = "~/openwebrx_access.log" # 访问日志
waterfall_colors = "[0x000000ff,0x0000ffff,0x00ffffff,0x00ff00ff,0xffff00ff,0xff0000ff,0xff00ffff,0xffffffff]" # 颜色
waterfall_min_level = -89 # 以 dB 为单位
waterfall_max_level = -18 # 以 dB 为单位
waterfall_auto_level_margin = (5, 40) # 自动模式下的瀑布幅度
mathbox_waterfall_frequency_resolution = 128 # 位数（3D 瀑布设置）
mathbox_waterfall_history_length = 10 # 秒（3D 瀑布设置）
mathbox_waterfall_colors = "[0x000000ff,0x2e6893ff, 0x69a5d0ff, 0x214b69ff, 0x9dc4e0ff,  0xfff775ff, 0xff8a8aff, 0xb20000ff]" # 颜色（3D 瀑布设置）
csdr_dynamic_bufsize = False # 定义 csdr 的缓冲模式
csdr_print_bufsizes = False  # 显示用于 csdr 进程的缓冲区大小
csdr_through = False # 如果设置为 True，将显示进入 DSP 链的数据量
nmux_memory = 32 # 以 MiB 为单位。定义 nmux 使用的循环缓冲区之大小
```

### 测试

插入 RTL-SDR，然后重启系统。

```
root@yukiho:~# lsusb
Bus 004 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub
Bus 002 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
Bus 003 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub
Bus 001 Device 002: ID 0bda:2838 Realtek Semiconductor Corp. RTL2838 DVB-T
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

列出 USB 设备，RTL-SDR 位列其中。

```
root@yukiho:~# cd /home/openwebrx
root@yukiho:/home/openwebrx# ./openwebrx.py
```

运行 OpenWebRX 以测试，如果没有任何报错，即安装成功，其回显应该像下面这样。

```
OpenWebRX - Open Source SDR Web App for Everyone!  | for license see LICENSE file in the package
_________________________________________________________________________________________________

Author contact info:    Andras Retzler, HA7ILM <randras@sdr.hu>

[openwebrx-main] Configuration script not specified. I will use: "config_webrx.py"
[openwebrx-main] nmux_bufsize = 253952, nmux_bufcnt = 505
[openwebrx-main] Started rtl_thread: rtl_sdr -D2 -s 2048000 -f 9500000 -p 0 -g 90 -| nmux --bufsize 253952 --bufcnt 505 --port 4951 --address 127.0.0.1
[openwebrx-main] Waiting for I/Q server to start...
nmux: listening on 127.0.0.1:4951
Found 1 device(s):
  0:  Realtek, RTL2838UHIDIR, SN: 00000001

Using device 0: Generic RTL2832U OEM
[openwebrx-main] I/Q server started.
[openwebrx-main] Starting watchdog threads.
nmux: pthread_create() done, clients now: 1
client 0x231a0f8: started!
[openwebrx-main] Starting spectrum thread.
[openwebrx-spectrum] Spectrum thread initialized successfully.
[openwebrx-dsp-plugin:csdr] Command = nc -v 127.0.0.1 4951 | csdr convert_u8_f | csdr fft_cc 2048 204 | csdr logaveragepower_cf -70 2048 1628 | csdr fft_exchange_sides_ff 2048 | csdr compress_fft_adpcm_f_u8 2048
[openwebrx-main] Starting HTTP server.
[openwebrx-spectrum] Spectrum thread started.
nmux: pthread_create() done, clients now: 2
client 0x231a1e0: started!
Connection to 127.0.0.1 4951 port [tcp/*] succeeded!
Found Rafael Micro R820T tuner
Enabled direct sampling mode, input 2
Enabled direct sampling mode, input 2/Q.
Exact sample rate is: 20480000.026491 Hz
Sampling at 20480000 S/s.
Tuned to 9500000 Hz.
Tuner gain set to 49.60 dB.
Reading samples in async mode...
Allocating 15 zero-copy buffers
client 0x231a0f8: CS_THREAD_FINISHED, client_goto_source = 2, errno = 32
```

### 映射至外网

前面已经在 VPS 和开发板上安装好了 Frp，使用只需要在上面运行相关的启动命令即可。为安全起见，博主的 VPS 没有开放 Frps 对应的 HTTP 8080 端口，所以不能通过端口号加域名访问，故在下文博主将通过 Nginx 反向代理将 8080 端口代理至 80 端口。

## 优化

### 添加启动项

官方推荐使用 `tmux` 来控制进程，博主在此基础上也写了一个控制 OpenWebRX 的 `init.d` 脚本，复制到 Notepad++，换行符选用 `UNIX (LF)`，保存文件为 `openwebrx` 并上传至 VPS 的 `/etc/init.d` 目录下，赋予 `755` 权限。

注意在复制时检查 OpenWebRX 安装路径是否与此脚本中的相同。

```
#!/bin/bash

### BEGIN INIT INFO
# System Required:   CentOS/Debian/Ubuntu (32bit/64bit)
# Description:       Manager for OpenWebRX, Written by Yukiho Kikuchi
# Author:            Yukiho Kikuchi
# Provides:          OpenWebRX
# Required-Start:    $network $local_fs $remote_fs
# Required-Stop:     $network $local_fs $remote_fs
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Description:       Open source, multi-user SDR receiver software with a web interface
### END INIT INFO

NAME="OpenWebRX"
NAME_BIN="openwebrx"
Info_font_prefix="\033[32m" && Error_font_prefix="\033[31m" && Info_background_prefix="\033[42;37m" && Error_background_prefix="\033[41;37m" && Font_suffix="\033[0m"
RETVAL=0

check_running(){
	PID=`ps -ef |grep "${NAME_BIN}" |grep -v "grep" |grep -v "init.d" |grep -v "service" |awk '{print $2}'`
	if [[ ! -z ${PID} ]]; then
		return 0
	else
		return 1
	fi
}
do_start(){
	check_running
	if [[ $? -eq 0 ]]; then
		echo -e "${Info_font_prefix}[Info]${Font_suffix} $NAME Has been running..." && exit 0
	else
		ulimit -n 51200
		tmux new -d -s openwebrx-session 'bash -c "cd /home/openwebrx; ./openwebrx.py; bash"'
		sleep 2s
		check_running
		if [[ $? -eq 0 ]]; then
			echo -e "${Info_font_prefix}[Info]${Font_suffix} $NAME Start successed!"
		else
			echo -e "${Error_font_prefix}[Error]${Font_suffix} $NAME Failed to start!"
		fi
	fi
}
do_stop(){
	check_running
	if [[ $? -eq 0 ]]; then
		kill -9 ${PID}
		RETVAL=$?
		if [[ $RETVAL -eq 0 ]]; then
			echo -e "${Info_font_prefix}[Info]${Font_suffix} $NAME Stop successed!"
		else
			echo -e "${Error_font_prefix}[Error]${Font_suffix}$NAME Failed to stop!"
		fi
	else
		echo -e "${Info_font_prefix}[Info]${Font_suffix} $NAME isn't running!"
		RETVAL=1
	fi
}
do_status(){
	check_running
	if [[ $? -eq 0 ]]; then
		echo -e "${Info_font_prefix}[Info]${Font_suffix} $NAME has been running..."
		echo -e "${Info_font_prefix}[Info]${Font_suffix} Listed PID:\n${PID}"
	else
		echo -e "${Info_font_prefix}[Info]${Font_suffix} $NAME isn't running!"
		RETVAL=1
	fi
}
do_restart(){
	do_stop
	do_start
}
case "$1" in
	start|stop|restart|status)
	do_$1
	;;
	*)
	echo "Usage: $0 { start | stop | restart | status }"
	RETVAL=1
	;;
esac
exit $RETVAL
```

因为是基于官方的 `tmux` 来写的，所以事先要安装 `tmux` 才可以正常使用此脚本。

```
root@yukiho:/home/openwebrx# apt install tmux -y
```

然后，将其加入开机启动项。

```
root@yukiho:~# cd /etc
root@yukiho:/etc# vi rc.local
```

```
#!/bin/sh -e
#
# rc.local
#
# This script is executed at the end of each multiuser runlevel.
# Make sure that the script will "exit 0" on success or any other
# value on error.
#
# In order to enable or disable this script just change the execution
# bits.
#
# By default this script does nothing.

/etc/init.d/frpc start

/etc/init.d/openwebrx start

exit 0
```

### 反向代理

80 端口已经被 Nginx 占用，所以 Frp 只好用了 8073 端口做映射，但是博主想让 OpenWebRX 不加端口号访问，所以需要反向代理。

修改 Nginx 的网站配置文件，设置反向代理，将 8073 端口反向代理到 80 端口上去。

贴出配置文件，实际情况需要做相应调整。

```
server {
    listen 80;
    server_name s.ibcl.us;
        location / {
          proxy_pass http://127.0.0.1:8073/;
        }
        location /ws/ {
          proxy_redirect off;
          proxy_pass http://127.0.0.1:8073/ws/;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_set_header Host $http_host;
        }
    access_log  off;
}
```

### 启用 CloudFlare CDN 和 HTTPS

启用 CDN 和 HTTPS，一是可以隐藏自己的真实 IP，也可以减缓 DDOS 攻击，至于 HTTPS 更是大势所趋。

但是用于穿透的小鸡已经被墙，所以为了复活博主的那台吃灰小鸡，[s.ibcl.us](https://s.ibcl.us) 只好用上了 CDN。

不过需要注意的是，启用 CDN 是有代价的：启用 CDN 之后，由于发送 POST 数据的 IP（开发板一方的 IP）与域名对应的 IP 不同，所以会被 SDR.hu 判定为恶意站点而不予列出......另外，大内网用户使用内网穿透服务也可能遇到此类问题。

所以如果您也启用了 CDN 或是 NAT 穿透，就没有必要去申请 API Key 了，因为 SDR.hu 的报错会使 OpenWebRX 无法运行。

下面是如何启用 CDN 的说明，您需要事先注册 CloudFlare 的账户，并将域名托管到 CloudFlare。

首先在 CloudFlare 中添加一条记录，指向 VPS，并点亮“云朵”。

![添加记录](https://c.ibcl.us/RTLSDR-Modifying_20190323/12.jpg "添加记录")

切换到 CloudFlare 的 Network 选项卡，然后打开 WebSocket 功能。

![启用 WebSocket](https://c.ibcl.us/RTLSDR-Modifying_20190323/13.jpg "启用 WebSocket")

等待记录生效，SDR 站点便会处于 CDN 的保护之下了。

然后切换到 CloudFlare 的 Crypt 选项卡，选择“SSL”为“Flexible”,随即可用 `HTTPS://` 的形式访问。

如需用户在访问时自动跳转，勾选“Always Use HTTPS”。

完成了吗？其实还没有，纵然 CloudFlare 已经要求用户与服务器通信实现底层安全协议传输，但是 OpenWebRX 仍然会让用户与后端建立未加密的 WebSocket 连接，即 `ws://`，而不是 `wss://`。

所以，接下来修改 `openwebrx.js` 这个文件（位于 OpenWebRX 目录的 htdocs 文件夹）第 1698 行，将 `ws_url="ws://"+(window.location.origin.split("://")[1])+"/ws/";` 修改为 `ws_url="wss://s.ibcl.us/ws/";`，这里的 `s.ibcl.us` 视情况而定。

然后，修改 OpenWebRX 的核心文件（位于 OpenWebRX 根目录） `openwebrx.py`，第 673 行，将 `ws_url="ws://"+(window.location.origin.split("://")[1])+"/ws/";` 修改为 `ws_url="wss://s.ibcl.us/ws/";`。

重启 OpenWebRX。

```
root@yukiho:~# /etc/init.d/openwebrx restart
```

访问 [s.ibcl.us](https://s.ibcl.us)，出现了久违的绿锁标志，也没有“混合内容”的警告。

![有效证书](https://c.ibcl.us/RTLSDR-Modifying_20190323/14.jpg "有效证书")

### 移动端页面

位于 [github.com/bclswl0827/webrx4mobile](https://github.com/bclswl0827/webrx4mobile)，这时博主修改后的，适用于手机页面的 OpenWebRX 页面。

由于精简了一些功能，所以博主称她为 OpenWebRX Lite。

## 步入生产环境

### SDR.hu 申请列出设备

这条是针对有公网 IP 搭建 SDR 站点的同学来说的。

前往 [sdr.hu/register](https://sdr.hu/register) 注册账户，得到 API Key 并填入 `config_webrx.py` 中，执行重启 OpenWebRX 的命令，稍等一会儿，设备就可以在 SDR.hu 的地图上列出了。

## 总结

博主折腾了三个小时，然后又花了三个小时记下了此次折腾，不知道对您是否有帮助呢？这应该是比较全面的一篇 OpenWebRX 进阶使用攻略了吧？
