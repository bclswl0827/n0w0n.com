---
title: 这或许是全网最完善的辉光钟 DIY 指南
date: 2023-08-23 00:07:10
categories: "硬件"
tags:
  - 硬件
  - 嵌入式
  - 单片机
  - 辉光钟
---

去年（2022 年） 8 月的某一天，博主逛淘宝时偶然刷到了一个 IN-12 辉光管，看完买家秀中展示的照片后，博主深深地被管子发出的幽幽红光给吸引住了，在 Google 上一番搜寻过后，博主发现大多数人都用它来做时钟。

虽然原理看上去非常简单，但显示时间的载体从液晶屏换到辉光管后，真的很炫酷。博主犹豫片刻过后，随即下单了一个 IN-12 管子和一个升压模块，决定先尝试将其点亮，看看效果如何，再决定是否继续。

几天后，快递如约而至，博主将升压模块和 IN-12 引脚连接好，接通 5V 电源后，辉光管发出了迷人的红光，博主也露出了满意的笑容。

![单只辉光管](https://c.ibcl.us/Nixie-Clock_20230823/1.jpg)

![成功点亮 IN-12](https://c.ibcl.us/Nixie-Clock_20230823/2.jpg)

试水计划顺利完成后，博主也没有闲下来，而是又下单了 3 只 IN-12，决定打造一台属于自己的辉光钟。在历经几个月的不断试错与改进过后，博主终于给交出了一份满意的答卷，**并将整个项目（PCB 文件、单片机程序、授时软件）开源到了 GitHub**，供更多人参考与借鉴。

[GitHub - bclswl0827/OpenNixie](https://github.com/bclswl0827/OpenNixie)

![博主的辉光钟成品](https://c.ibcl.us/Nixie-Clock_20230823/3.jpg)

<!-- more -->

# 硬件方案

## 升压方案

在网上搜寻后，博主发现 MAX1771 对于这个项目是一个近乎完美的升压方案，其外设极其简单，只需要设计好反馈电阻即可。比较可惜的是，网上现成的 MAX1771 升压电路，输入电压基本都是 12V，而电路中其他模块又需要 5V 供电，所以只能再外加一个 LDO 模块（AMS1117）来实现 12V 转 5V。

最后，博主画出的完整升压模块原理图长这样。

![MAX1771 升压原理图](https://c.ibcl.us/Nixie-Clock_20230823/4.png)

**需要注意的是，图中代号为 C3 的 10uF 电解电容，耐压值需要在 200V 以上，这样才能承受较高的输出电压。**

值得一提的是，MAX1771 还提供了一个使能引脚（SHDN 引脚），让用户可以通过控制这一引脚的电平高低，从而使能或禁能升压。

## 驱动方案

网络上大多数的辉光钟项目，都采用了 74141 或 K155ID1 译码器芯片来控制辉光管的亮灭，无奈这些芯片要么假货遍地，要么价格太贵，让博主不敢贸然下手。在与一位朋友交流后，这位朋友提到可以使用有高耐压值的 NPN 三极管来控制辉光管亮灭，从而避开这些芯片。

经过选型，博主发现 MPSA42 三极管恰好符合项目需求，淘宝上这款三极管的售价也非常便宜，不出 10 元就能买到一大包，性价比直接暴打 74141 和 K155ID1。

但是这一方案又会导致一个新问题，那就是若使用常用的静态扫描方式驱动辉光管，4 个辉光管加一个氖灯符号则将会用去 4 + 4*10 + 1 个 NPN 三极管，如此一来，不光 PCB 装不下这么多器件，即便装下了，布线也是个麻烦事。因此，博主也只能退而求其次，采用动态扫描方式进行驱动，从而也将 NPN 三极管的数量压缩到 4 + 10 + 1 个。解决方法看似很完美，但是这样会导致辉光管的亮度会暗一些。

在原理图中，博主用分层的方式，单独画出了辉光管段选和位选驱动的原理图。

![辉光管段选原理图](https://c.ibcl.us/Nixie-Clock_20230823/5.png)

![辉光管位选原理图](https://c.ibcl.us/Nixie-Clock_20230823/6.png)

在辉光管位选原理图中，博主使用的是 20k 欧姆的限流电阻，**需要注意的是，这里的限流电阻功率需要比其他电阻稍大一些（如选用功率为 0.5W 的电阻），从而避免长期运行过烫而导致电阻寿命缩短**。

## 寄存器组合

根据前面的描述可以得出，总共有 16 个引脚需要控制（升压模块使能脚、辉光管段选三极管、辉光管位选三极管、氖灯符号三极管）。由于用于控制的单片机片上 GPIO 资源比较宝贵，不可能 16 个控制脚都接去单片机 GPIO 上，所以博主决定使用两个 74HC595 芯片级联组成一个 16 位的寄存器，从而实现只用 3 个片上 GPIO 对辉光钟进行控制。

原理图如下，博主还附上了一张表格描述寄存器位数对应的功能。

![74HC595 原理图](https://c.ibcl.us/Nixie-Clock_20230823/7.png)

| 寄存器位 | 位功能       | 位描述     |
| :------- | :----------- | :--------- |
| [0:9]    | 辉光钟段选   | 高电平使能 |
| [10:13]  | 辉光钟位选   | 低电平使能 |
| [14:15]  | 氖灯符号位   | 高电平使能 |
| [15:16]  | MAX1771 使能 | 低电平使能 |

## 单片机、串口、RTC

由于博主的实验室有堆积如山的 STC89C51 工业垃圾，所以博主也就直接选用了这款单片机。

![DIP-40 封装的 STC89C51 单片机](https://c.ibcl.us/Nixie-Clock_20230823/8.jpg)

STC89C51 单片机带有一个串口，博主将其连接到了 BLE 蓝牙模块，从而实现透过无线蓝牙对辉光钟授时。至于蓝牙模块，博主选用的是 JDY-34-SPP。

RTC 芯片的选型是 DS3231，和一般的 DS1302 相比，DS3231 有更高的精度。DS3231 使用 I2C 协议与单片机进行通信，但是由于 STC89C51 单片机没有硬件 I2C，所以博主只能使用软件模拟 I2C 的方式来实现与 DS3231 的通信，虽然速度稍慢，不过也完全足够应付需求了。

提到这里，博主就不得不推一波去年疫情空档期为 8051 单片机打造的一款 Arduino 风格函数库了，这款函数库提供了包含 I2C、SPI、UART 在内的函数，且与 Arduino 的函数功能保持一致，让用户可以在只对代码做少量修改，直接将 Arduino 的项目代码移植到 8051 单片机上。这款函数库目前也以 MIT 协议开源到了 GitHub 上，本项目也将在此库基础上进行开发。

[GitHub - bclswl0827/51duino](https://github.com/bclswl0827/51duino)

基于此库，例如要读取 DS3231 的时间，只需调用库中提供的 `WireBeginTransmission()`、`WireWrite()`、`WireRead()`、`WireRequestFrom()` 等函数即可，与在 Arduino 平台上开发的代码基本一致，同时，分配给 I2C 的引脚也可以在相关头文件中进行变更。

```cpp
#include <stdint.h>
#include "framework/wire.h"

#define DS3231_ADDRESS 0x68

typedef struct {
    uint8_t year;
    uint8_t month;
    uint8_t day;
    uint8_t week;
    uint8_t hour;
    uint8_t minute;
    uint8_t second;
} time_t;

void getTime(time_t* time) {
    WireBeginTransmission(DS3231_ADDRESS);
    WireWrite(0x00);
    WireEndTransmission();
    WireRequestFrom(DS3231_ADDRESS, 7);

    time->second = bcdToDec(WireRead() & 0x7F);
    time->minute = bcdToDec(WireRead());
    time->hour = bcdToDec(WireRead());
    time->week = bcdToDec(WireRead());
    time->day = bcdToDec(WireRead());
    time->month = bcdToDec(WireRead());
    time->year = bcdToDec(WireRead());
}
```

## PCB 设计

为了项目有较强的可拓展性，博主决定设计一款适用于大多数辉光管的标准插座，IN-12 则透过转接板对接到标准插座。这样一来，以后若想要更换辉光管型号，只需另外设计转接板即可，不需要对 PCB 进行任何改动，成本极低。

![IN-12 转接板](https://c.ibcl.us/Nixie-Clock_20230823/9.jpg)

![QS-27 转接板](https://c.ibcl.us/Nixie-Clock_20230823/10.jpg)

博主使用 KiCAD 7.0.0 来设计 PCB，由于本项目和射频、模拟电路等关系不大，因此 PCB 的设计也比较简单，只需将原理图中的元件进行布局、连线、铺铜。DRC 通过后，导出 Gerber 文件即可交送厂商生产。为了方便手工焊接，所以博主尽量选用了直插元器件。

![PCB 正面](https://c.ibcl.us/Nixie-Clock_20230823/11.jpg)

![PCB 背面](https://c.ibcl.us/Nixie-Clock_20230823/12.jpg)

PCB 尺寸 152 * 55 mm，嘉立创打样 5 片 PCB 的费用是 40.02 元。**博主也建议在月底打板 PCB，这样可以在次月领到两张免费券，从而免去转接板的打板费用。**

PCB 以及转接板的完整设计文件位于仓库的 [circuit 目录下](https://github.com/bclswl0827/OpenNixie/tree/master/circuit)，**经过博主实测，KiCAD 对于跨版本的支持并不好，所以在二次开发时需要注意 KiCAD 的版本号最好同博主保持一致（使用 7.0.0 版本），避免出现奇怪的错误**。

截止发文时，博主已经为这个项目制作了 IN-12、QS-27 两款辉光管的转接板，博主预计在不久的将来还能支持更多辉光管，博主也欢迎用户自行制作转接板，并向仓库提交 PR。

# 软件方案

## 单片机端

单片机的完整源码位于仓库的 [firmware 目录下](https://github.com/bclswl0827/OpenNixie/tree/master/firmware)，为了充分享受自动补全、代码高亮、自动格式化等现代生产力黑科技，所以博主抛弃了传统的 Keil（补一句，Keil 真是又丑又难用），而是使用了 VSCode 上的 EIDE 插件作为 STC89C51 的开发环境。在 VSCode 上安装该插件后，打开 firmware 目录下的 `OpenNixie.code-workspace` 文件，即可进入 EIDE 工作区编辑代码、构建项目、烧录固件。

### 辉光管驱动

由于博主使用 74HC595 移位寄存器来控制整个设备，所以需要为 74HC595 编写驱动程序，以正确设定对应位（引脚）的电平。根据前文表格中提到的寄存器各位之功能，则可以编写出如下几个函数。

```cpp
#define LATCH P24 // 74HC595 锁存脚
#define DATA P23  // 74HC595 数据脚
#define CLOCK P22 // 74HC595 时钟脚

// 设定段选（显示 0-9 之一数字）
uint16_t setSegment(uint8_t val) {
    return val < 10 ? 1 << val : 0;
}

// 设定位选（使能 0-4 之一辉光管）
uint8_t setBit(uint8_t val) {
    switch (val) {
        case 3:
            return 0x07;
        case 2:
            return 0x0B;
        case 1:
            return 0x0D;
        case 0:
            return 0x0E;
    }

    return 0x0F;
}

// 设定氖灯符号（开或关）
uint8_t setSymbol(uint8_t val) {
    return val ? 1 : 0;
}

// 设定 MAX1771（使能或禁能）
uint8_t setEnable(uint8_t val) {
    return val ? 0 : 1;
}

// 计算寄存器值（作为参数调用 shiftOut 函数）
uint16_t setNixie(uint8_t enable,
                  uint8_t symbol,
                  uint8_t _bit,
                  uint16_t segment) {
    return (enable << 15) | (symbol << 14) | (_bit << 10) | segment;
}

// 根据寄存器值设定 595 各引脚电平
void shiftOut(uint16_t val) {
    LATCH = 0;

    for (uint8_t i = 0; i < 16; i++) {
        DATA = !!(val & (1 << (15 - i)));
        CLOCK = 1;
        CLOCK = 0;
    }

    LATCH = 1;
}
```

由于博主的项目采用动态扫描方式进行显示，所以，例如要显示 `1 2·3 4`，则可以编写下述代码片段。

```cpp
uint8_t enable = setEnable(1);
uint8_t symbol = setSymbol(1);

uint16_t s0 = setSegment(1);
uint16_t s1 = setSegment(2);
uint16_t s2 = setSegment(3);
uint16_t s3 = setSegment(4);

while (1) {
    shiftOut(setNixie(enable, symbol, setBit(0), s0));
    shiftOut(setNixie(enable, symbol, setBit(1), s1));
    shiftOut(setNixie(enable, symbol, setBit(2), s2));
    shiftOut(setNixie(enable, symbol, setBit(3), s3));

    // 避免出现鬼影
    delayMicroseconds(10);
    shiftOut(setNixie(setEnable(0), symbol, setBit(0), 0));
}
```

### 阴极保护

由于辉光管长期运行可能发生中毒现象，因此需要避免长期显示某个固定的数字。解决的方案则是定时显示一遍所有数字，代码只需基于上述片段稍作修改即可。

```cpp
void setProtection() {
    for (uint8_t i = 0; i < 10; i++) {
        uint16_t s0 = setSegment(i);
        uint16_t s1 = setSegment(i);
        uint16_t s2 = setSegment(i);
        uint16_t s3 = setSegment(i);

        uint8_t enable = setEnable(1);
        uint8_t symbol = setSymbol(0);
        for (uint8_t j = 0; j < 5; j++) {
            shiftOut(setNixie(enable, symbol, setBit(0), s0));
            shiftOut(setNixie(enable, symbol, setBit(1), s1));
            shiftOut(setNixie(enable, symbol, setBit(2), s2));
            shiftOut(setNixie(enable, symbol, setBit(3), s3));

            delayMicroseconds(10);
            shiftOut(setNixie(setEnable(0), symbol, setBit(0), 0));
        }
    }
}
```

在上面的代码中，若要调整数字显示的时长，可以修改内层循环 `j < 5` 到其他值。

### 校准时间

为了让辉光钟正确识别来自授时客户端的授时请求，博主定义了一系列的命令字和应答字。

```cpp
#define CMD_WORD 0xE0 // 命令字
#define ACK_WORD 0xE1 // 应答字

#define YEAR_WORD 0xF1   // 年位命令
#define MONTH_WORD 0xF2  // 月位命令
#define DAY_WORD 0xF3    // 日位命令
#define WEEK_WORD 0xF4   // 星期位命令
#define HOUR_WORD 0xF5   // 小时位命令
#define MINUTE_WORD 0xF6 // 分钟位命令
#define SECOND_WORD 0xF7 // 秒数位命令
```

当单片机监测到串口数据与命令字相匹配时，则开始接收位命令（年月日时分秒等）和时间数据，并将数据写入 RTC 芯片的对应位，写入操作完成后，再往外发送应答字，指示本次授时成功，代码如下。

```cpp
// ... 其他代码

time_t time;
while (1) {
    if (SerialAvailable() && SerialRead() == CMD_WORD) {
        uint8_t cmd = SerialRead();
        uint8_t dat = SerialRead();

        switch (cmd) {
            case YEAR_WORD:
                time.year = dat;
                break;
            case MONTH_WORD:
                time.month = dat;
                break;
            case DAY_WORD:
                time.day = dat;
                break;
            case WEEK_WORD:
                time.week = dat;
                break;
            case HOUR_WORD:
                time.hour = dat;
                break;
            case MINUTE_WORD:
                time.minute = dat;
                break;
            case SECOND_WORD:
                time.second = dat;
                break;
        }

        setTime(&time);
        SerialWrite(ACK_WORD);
    }

    // ... 其他代码
}
```

## 授时客户端

博主提供了用 Python、Go、TypeScript 编写的三个授时客户端，**此外，由 TypeScript 编写的客户端基于浏览器实验特性 WebBluetooth，需要使用最新版 Chrome 或者 Edge 才能运行**。

三个版本的授时工具的完整源码位于仓库的 [tools 目录下](https://github.com/bclswl0827/OpenNixie/tree/master/tools)，用户可以对其自行构建或二次开发。

对于一般用户，使用 TypeScript 的版本即可，只需要打开 [ibcl.us/OpenNixie](https://ibcl.us/OpenNixie/)，点击屏幕的任意位置即可开始配对和授时。

![TypeScript 版本授时客户端](https://c.ibcl.us/Nixie-Clock_20230823/13.png)

# 成果展示

![显示随机数](https://c.ibcl.us/Nixie-Clock_20230823/14.gif)

![网页授时](https://c.ibcl.us/Nixie-Clock_20230823/15.gif)

# 一些补充

除了 GitHub 仓库的 Issue 之外，博主还建了一个 Telegram 群组，方便为读者解答辉光钟 DIY 过程中遇到的各种问题，欢迎加入。

对了，现在还却一个外壳，可惜博主不会做 3D 设计，所以只能等待有缘人帮忙设计了。

[t.me/OpenNixie](https://t.me/OpenNixie)
