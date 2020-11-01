---
title: 接收日本ＪＭＨ气象传真
date: 2018-07-06 21:08:08
categories: "广播"
tags:  [广播,气象传真]
---
博主的期末考试终于结束了，在家闲着没事干，于是来研究研究怎么接收日本ＪＭＨ的气象传真...

<!--more-->

博主使用的 Windows 10 的系统，可以使用一款名为 KG-FAX 的软件。

KG-FAX 的官网位于 [http://www2.plala.or.jp/hikokibiyori/soft/kgfax/](http://www2.plala.or.jp/hikokibiyori/soft/kgfax/)，下载链接可以在页面底部找到，如果嫌麻烦，下方是一份备份。

> [KG-FAX 下载](https://c.ibcl.us/JMHWeather-Fax_20180706/kgfax.zip)

博主下载后解压运行，却发现是一堆乱码。这是系统编码的问题，因为 KG-FAX 所使用的编码是 Shift-JIS，与简中系统不兼容，只有借助外挂程序转码。Ntleas 则是一个很好的转码工具。

> [Ntleas 下载](https://c.ibcl.us/JMHWeather-Fax_20180706/ntleas046_x64.7z)

由于市区无线电干扰比较严重，故这次使用在线 SDR 接收气象传真。为了能让 KG-FAX 采集到来自 SDR 的声音，所以还得安装一个虚拟声卡。这里使用 Virtual Audio Cable。

> [Virtual Audio Cable下载](https://c.ibcl.us/JMHWeather-Fax_20180706/VirtualAudioCable.zip)

## 开始

### 配置虚拟声卡（安装过程不再赘述）：

 1. 右键单击音量图标，在弹出的菜单中选定播放设备。
![选定播放设备](https://c.ibcl.us/JMHWeather-Fax_20180706/1.jpg "选定播放设备")

 2. 在弹出的对话框中将 Line 1 设定为默认值。
![设为默认值](https://c.ibcl.us/JMHWeather-Fax_20180706/2.jpg "设为默认值")

 3. 切换标签为录制，然后执行同样的操作。
![切换标签为录制](https://c.ibcl.us/JMHWeather-Fax_20180706/3.jpg "切换标签为录制")

### 启动 KG-FAX：

 1. 先运行前面提到的 Ntleas，防止出现乱码。
![运行 Ntleas](https://c.ibcl.us/JMHWeather-Fax_20180706/4.jpg "运行 Ntleas")

 2. 填入 KG-FAX 的路径，然后 Save & Run。
![Save & Run](https://c.ibcl.us/JMHWeather-Fax_20180706/5.jpg "Save & Run")

 3. 启动后没有乱码出现。
![启动](https://c.ibcl.us/JMHWeather-Fax_20180706/6.jpg "启动")

### 接收来自ＪＭＨ的信号：

 1. 打开一个在线 SDR 网站。
[https://sdr.hu/](https://sdr.hu/)

 2. 挑选在线 SDR，每一个 SDR 都有标记信息以及地理位置。
![挑选在线 SDR](https://c.ibcl.us/JMHWeather-Fax_20180706/7.jpg "挑选在线 SDR")

 3. 下面这份 PDF，包含了全球范围的气象传真频率以及时间表。
[https://c.ibcl.us/JMHWeather-Fax_20180706/rfax.pdf](https://c.ibcl.us/JMHWeather-Fax_20180706/rfax.pdf)

 4. 日本 JMH 的气象传真使用上边带，实际解调频率低于公布频率 1.9 kHz。例如接收 JMH4 13988.5 kHz，需要 13988.5 kHz - 1.9 kHz = 13986.6 kHz，在 SDR 中输入这个频率，单击 USB。
![打开接收机](https://c.ibcl.us/JMHWeather-Fax_20180706/8.jpg "打开接收机")

 5. 按下掃引后开始检测信号，有信号时会自动开始接收。
![按下掃引](https://c.ibcl.us/JMHWeather-Fax_20180706/9.jpg "按下掃引")

稍等片刻，一份传真接收完成后会自动保存。于是大功告成:)

## 博主收到的图片

![传真测试图](https://c.ibcl.us/JMHWeather-Fax_20180706/10.jpg "传真测试图")

![传真频率表](https://c.ibcl.us/JMHWeather-Fax_20180706/11.jpg "传真频率表")

![一份残缺的传真](https://c.ibcl.us/JMHWeather-Fax_20180706/12.jpg "一份残缺的传真")