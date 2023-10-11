---
title: 吃灰开发板拿出来，咱们来听听地球吧
date: 2023-10-09 18:56:42
categories: "地震"
tags:
  - 硬件
  - 嵌入式
  - 单片机
  - C / C++
  - Golang
  - 串口
  - 前端
  - React
  - Linux
  - TypeScript
---

博主在今年（2023 年）上半年在带领实验室其他成员报名「全国大学生嵌入式芯片与系统设计竞赛」时，在项目选题时却犹豫不止，大多数人都是选择在「智能小车」、「智能机器人」及其相关的项目上下功夫，而博主却想做点不一样的。

在报名截止的前夕，博主突然想起博主的[一位朋友曾经给博主提到他买过一台名叫 Raspberry Shake 的地震仪](https://github.com/TenkyuChimata)，这台地震仪可以将地震波数据整合或上传到云端，供用户调阅查看，而且[他也长期在 Bilibili 上直播地震仪测到的实时数据](https://live.bilibili.com/22863790)，在看过他的直播后，博主立刻被这台地震仪所吸引住了。

最后，博主决定用比赛方提供的龙芯开发板，造一台自己的地震仪，但由于 Raspberry Shake 不开源核心代码，所以博主只能自己动手，一切从零开始。

在历经 3 个多月紧张的开发后，博主终于实现了这套系统的基本功能，并一举挺进了全国总决赛，最终拿下了全国一等奖的好成绩。

在获得佳绩后，博主也决定将这一整套系统开源到 GitHub 上，并继续加以维护，**毕竟博主并不是地球物理学专业的学生，所以博主也希望能有更多的专业人士能够参与到这个项目中来，从而使这个项目能够更加完善**。

先晒出几张博主测到的地震波数据图，数据均来自博主设立在重庆北碚区的自研地震仪，由博主的那位朋友托管。

![CST 2023-07-23 09:00:27 内江威远 M3.3](https://c.ibcl.us/Earthquake-Sensor_20231009/1.png)

![CST 2023-08-10 17:02:47 雅安石棉 M3.4](https://c.ibcl.us/Earthquake-Sensor_20231009/2.png)

![CST 2023-08-29 03:55:32 印尼巴厘海 M7.1](https://c.ibcl.us/Earthquake-Sensor_20231009/3.png)

<!-- more -->

# 项目架构

先贴出博主的项目总体架构图，其中，博主将下位机称作 Explorer，上位机称作 Observer。

![项目总体架构图](https://c.ibcl.us/Earthquake-Sensor_20231009/4.svg)

下位机中，用于监测地震的传感器是三个速度型地震检波器，自然频率为 4.5 Hz，灵敏度 0.288 V/cm/s。这三个检波器又由两个**水平地震检波器**和一个**垂直地震检波器**组成，负责采集由三个方向（东西、南北、垂直）收集而来的电压数据，并将数据打包传送到上位机进行进一步处理。

上位机部分，在后端软件收到来自下位机的数据后，程序会先对数据做校验，若校验通过，则将数据送入一个缓冲区。与此同时，另外一个协程则负责将缓冲区的数据按秒组装成一帧完整的数据包，并打上精确时标，然后透过零极点配置补偿法对低频做补偿，再将数据包派发给各个模块的订阅者（如 PostgreSQL 存储队列、前端 WebSocket、MiniSEED 存档模块），最后各个模块再根据自己的需求对数据进行处理。

上下位机通信方面，博主使用了串口通信。通信所使用的波特率和各通道的数据包长由用户事先在双方的配置文件中指定好。由于下位机中还涉及到 ADC 采样率的配置，所以可以透过这三个变量，灵活地组合出各种实际采样率。

另外，下位机通常需要摆放在安静的地方，由于博主的上下位机距离较远，所以最后用到了 LoRa 无线模块做透传，实现了无线通信。

![LoRa 模块](https://c.ibcl.us/Earthquake-Sensor_20231009/5.jpg)

需要注意的是，**由于 LoRa 模块在一定时间内有数据包传输大小的限制，所以只能将通道数据包的长度尽量调小，同时合理增大 ADC 的采样率，采用「小包快发」的方式，在保证数据完整性的前提下，尽可能地提高数据传输效率**。

经过博主实测，使用 LoRa 模块且波特率为 19200 时，这种方案能够达到 90 Sps 的实际采样率，已经满足地震监测的需求（即满足 Nyquist Frequency）。

下图是博主在学校校内设立的站点，使用太阳能供电，无需外接电源，并可长期运行，下位机数据便是透过 LoRa 无线模块传输到上位机的。

![校内测站](https://c.ibcl.us/Earthquake-Sensor_20231009/6.jpg)

**除了使用 LoRa 模块，如果只是近距离的无线通信，则可以使用一些便宜的蓝牙模块，如 JDY-31（前提是上位机也要支援蓝牙，若不支援可以用 USB 蓝牙模块），这种模块的通信距离在 10 M 左右**，当波特率为 115200 时，透过合理配置包长和 ADC 采样率，也能达到 100 Sps 的实际采样率。

蓝牙模块修改波特率一般可以使用 AT 命令，至于具体操作，可以参考[这份手册](https://manuals.plus/zh-TW/transmission-module/bluetooth-spp-serial-port-transparent-transmission-module-manual)。

# 下位机

项目下位机使用 C++ 编写，在时下流行的 PlatformIO IDE 上进行开发，下位机的代码仓库地址如下：

[GitHub - bclswl0827/explorer](https://github.com/bclswl0827/explorer)

下位机默认运行的平台为 STM32F103C8T6 核心板，但是透过修改 `platformio.ini` 文件和少许引脚定义（ADC 的 RST 和 DRDY 引脚定义），即可轻易在其他开发板上运行。

在项目刚起步时，博主使用的 ADC 是 16 位的 ADS1115，但是在后来的实际测试中，博主发现 ADS1115 的采样速度和数据精度均无法满足项目需求。而在一番调研后，博主又发现用于地震领域的 ADC 实在太贵，最后只能退而求其次，选择了 24 位的 ADS1256，经过实测，这款 ADC 除了稳定性比较堪忧外，其他方面能勉强满足项目需求，而且价格也比较亲民。

ADS1256 的驱动代码由博主自行编写（读 Datasheet 是一件很痛苦的事情，驱动写完人已经麻了），位于 `src/ads1256` 目录下。由于 ADS1256 在运行过程中容易受到干扰，导致部分配置寄存器值发生变化，所以博主在代码中加入了一些校验机制，在检测到发生错误时，程序自动进行复位，从而保证数据的准确性。然而这又导致了一个新的问题，那就是每轮采集前都会对配置寄存器做校验，这会消耗不少时间，所以实际采样率也会跟着下降，不过采样率依然能够满足项目需求，所以也就忽略不计了。

下面是博主另外制作的一套下位机成品，使用了蓝牙通信，**其中垂直通道（EHZ）、东西通道（EHE）和南北通道（EHN）以差分形式输入 ADC**。

| 通道名称 | 差分输入口 |
| :------: | :--------: |
|   EHZ    | AIN3、AIN4 |
|   EhE    | AIN5、AIN6 |
|   EhN    | AIN7、AIN8 |

![下位机成品](https://c.ibcl.us/Earthquake-Sensor_20231009/7.jpg)

配置好下位机参数，刷写好下位机固件并启动设备后，若要透过蓝牙与其建立串口连接，Linux 下可以使用 `hcitool` 和 `rfcomm` 命令。

先扫描设备，获取蓝牙设备的 MAC 地址（以 00:00:00:00:00:00 为例）：

```shell
yuki@yuki-pc:~$ hcitool scan
Scanning ...
        00:00:00:00:00:00       JDY-31-SPP
```

随即建立串口连接：

```shell
yuki@yuki-pc:~$ sudo rfcomm connect 0 00:00:00:00:00:00
Connected /dev/rfcomm0 to 00:00:00:00:00:00 on channel 1
Press CTRL-C for hangup
```

不出意外，可以在 `/dev` 目录下看到多出了一个名为 `rfcomm0` 的设备，这个设备就是蓝牙串口设备，可以像使用普通串口设备一样使用它。

# 上位机

项目上位机使用 B/S 架构，后端使用 Golang + Gin 编写，前端则使用 TypeScript + React + TailwindCSS，代码仓库地址如下：

[GitHub - bclswl0827/observer](https://github.com/bclswl0827/observer)

博主已经为这个项目启用了 GitHub Actions，每次有新的提交时，[GitHub 都会自动构建最新的 Release 版本](https://github.com/bclswl0827/observer/releases)，从而便于一般用户直接下载最新的预编译的版本。预编译提供包含 Linux 下 x86_64、arm64 和 armv7l 三种架构的二进制文件，以及 Windows 下 x86 和 x86_64 两种架构的二进制文件，用户可以根据自己的场景和需求选用。

若要启用历史数据查询功能，在使用上位机前，上位机需要预装 PostgreSQL 数据库（也可以安装在其他服务器远程连接），安装好 PostgreSQL 数据库后，创建一个空白的库，这里以 `observer` 为库名，用户名以 `postgres`，密码以 `passw0rd` 为例。

接下来配置上位机参数，这些参数均位于 `config.json` 文件中，在用户下载的 Release 预编译版本中，也已经附上了这个文件，用户只需稍加修改其中的参数即可，下面是这些参数字段的介绍。

```json
{
    "station_settings": {
        "uuid": "a373e39c-8e15-44ae-a1ad-6fb622bc49e6", // 测站 UUID，自行生成，用于标识站点
        "name": "Test Station", // 测站名字，会显示在测站前端
        "latitude": 1.0, // 测站纬度
        "longitude": 1.0, // 测站经度
        "altitude": 0 // 测站海拔
    }, // 测站基础配置
    "geophone_settings": {
        "ehz": {
            "sensitivity": 0.288, // EHZ 检波器灵敏度，单位 V/cm/s
            "damping": 0.6, // EHZ 检波器阻尼
            "frequency": 4.5, // EHZ 检波器自然频率
            "compensation": true // EHZ 是否开启低频补偿
        }, // EHZ 通道配置
        "ehe": {
            "sensitivity": 0.288, // EHE 检波器灵敏度，单位 V/cm/s
            "damping": 0.6, // EHE 检波器阻尼
            "frequency": 4.5, // EHE 检波器自然频率
            "compensation": true // EHE 是否开启低频补偿
        }, // EHE 通道配置
        "ehn": {
            "sensitivity": 0.288, // EHN 检波器灵敏度，单位 V/cm/s
            "damping": 0.6, // EHN 检波器阻尼
            "frequency": 4.5, // EHN 检波器自然频率
            "compensation": true // EHN 是否开启低频补偿
        } // EHN 通道配置
    },
    "adc_settings": {
        "resolution": 24, // 下位机 ADC 位深
        "fullscale": 5.0 // 下位机 ADC 满量程，单位 V
    }, // 下位机 ADC 参数配置
    "serial_settings": {
        "packet": 4, // 下位机通道数据包长，对应下位机配置字段 PACKET_SIZE
        "baud": 19200, // 下位机波特率，对应下位机配置字段 SERIAL_BAUD
        "device": "/dev/ttyUSB0" // 下位机串口设备，根据实际情况修改
    }, // 串口通信参数配置
    "ntpclient_settings": {
        "host": "0.pool.ntp.org", // NTP 服务器地址
        "port": 123, // NTP 服务器端口
        "timeout": 3, // NTP 请求超时时间，单位秒
        "interval": 5 // NTP 请求间隔，单位秒
    }, // NTP 客户端参数配置
    "archiver_settings": {
        "enable": false, // 是否开启 PostgreSQL 存档，若关闭，前端将无法查看历史数据
        "host": "127.0.0.1", // PostgreSQL 存档服务器地址
        "port": 5432, // PostgreSQL 存档服务器端口 
        "username": "postgres", // PostgreSQL 用户名
        "password": "passw0rd", // PostgreSQL 密码
        "database": "observer" // PostgreSQL 数据库名
    }, // MiniSEED 存档参数配置
    "server_settings": {
        "host": "0.0.0.0", // 上位机前端服务器地址
        "port": 8073, // 上位机前端服务器端口
        "cors": true, // API 是否允许跨域访问
        "debug": false // 是否开启调试模式，正式部署时关闭
    }, // 上位机前端服务器参数配置
    "miniseed_settings": {
        "enable": false, // 是否开启 MiniSEED 存档，若要启用 SeedLink 服务，则必须开启
        "path": "/data/miniseed", // MiniSEED 存档路径
        "station": "TEST", // MiniSEED 测站名
        "network": "XX", // MiniSEED 网络名
        "lifecycle": 10 // MiniSEED 存档周期，单位天
    } // MiniSEED 存档参数配置
}
```

若要开启 SeedLink 服务，需要从源码安装 [RingServer](https://github.com/EarthScope/ringserver)，然后在配置文件的 `miniseed_settings` 字段中将 `enable` 字段修改为 `true`，最后参考 [这篇教程](https://seiscode.iris.washington.edu/projects/ringserver/wiki/How_to_configure_ringserver_as_a_SeedLink_streaming_server) 配置好 RingServer，启动后 5 分钟左右即可在 Swarm、SeisComP3 等软件中连接到 SeedLink 服务并查看地震波数据。

还需要注意的是 ADC 配置字段，若下位机开启了一倍以上的 PGA（对应下位机配置字段 `GAIN_RATE`），则需要对该字段进行修改，将 `5` 改为实际满量程。以 ADS1256 为例，PGA 与满量程的对应关系如下：

|  PGA  | 满量程（V） |
| :---: | :---------: |
|   1   |     5.0     |
|   2   |     2.5     |
|   4   |    1.25     |
|   8   |    0.625    |
|  16   |   0.3125    |
|  32   |   0.15625   |
|  64   |  0.078125   |

# 效果展示

前端首页主要展示当前测站的状况，包含测站名、测站位置、在线时长、解码数量，丢包数量，与标准时间偏移量，CPU 及内存占用率。其中，「已推送讯息量」、「推送失败讯息量」、「等待推送讯息量」是为以后的中心服务器做准备的，目前还没有实际用途。

![前端首页](https://c.ibcl.us/Earthquake-Sensor_20231009/8.jpg)

波形页面主要展示当前测站的波形图，包含三个通道的波形图，用户可以用拖拽的方式对任意通道的数据进行缩放，在波形图表下方有，还有实时计算的 PGA、PGV 数据、震度数据，另外，震度标准可以自行切换，目前默认为 JMA 标准。

在页面接近顶部的位置，有实时计算得出的下位机采样率，用户在调整下位机采样率时，可以透过这个数据来判断是否达到了预期的采样率。

![前端波形](https://c.ibcl.us/Earthquake-Sensor_20231009/9.jpg)

若用户在配置文件开启了数据库存档功能，则可以在历史页面查看历史数据，**目前查询方式有两种，一种是按时间段查询，另一种是按地震事件查询**，用户可以根据自己的需求来选择。

第一种方式，用户可以点击页面上的起始和结束时间选择器，来选择自己想要查询的时间段，再点击「调阅波形」按钮，即可查询到该时间段内的所有数据。

第二种方式，用户可以点击「地震反查」按钮，选择一个地震数据来源，然后选择要查询的地震事件，即可将时间段自动填入时间选择器中，用户只需要再点击「调阅波形」按钮即可查询到该地震事件的所有数据。

由于前端只是简单地显示了波形，若要对地震事件的频谱进行分析，可以点击「数据下载」按钮，选择要导出的通道名称，即可将数据导出为 SAC 格式，进而使用相关软件（如 Swarm）进行分析。

若要将地震事件分享给其他人，可以点击「分享」按钮，然后将弹出的链接分享给其他人，其他人打开链接后，起始和结束时间选择器中的时间段将会自动填充为该地震事件的时间段，其他人只需要点击「查询」按钮即可查询到该地震事件的所有数据。

![前端历史](https://c.ibcl.us/Earthquake-Sensor_20231009/10.jpg)

若用户在配置文件开启了 MiniSEED 存档功能，则可以在数据下载页面导出以天为单位的 MiniSEED 格式的数据。

![前端导出](https://c.ibcl.us/Earthquake-Sensor_20231009/11.jpg)

最后启用 SeedLink 后的效果，用户可以在 Swarm 中直接连接 SeedLink 服务，从而实时查看地震波数据（波形 + 频谱）。

![SeedLink](https://c.ibcl.us/Earthquake-Sensor_20231009/12.jpg)

# 待解决的问题

- [ ] 现在还缺少一个中心服务器，用于接收各个测站的数据，并像 Raspberry Shake 那样，提供一个地震波数据的查询平台
- [ ] 由于博主不是地球物理学专业的学生，所以对于地震波的处理还不是很熟悉，目前的地震波数据处理算法还有待改进
- [ ] 震度计算算法还有待改进，目前只是简单地使用了 PGA、PGV 算出了震度，但是这种算法并不准确
- [ ] 需要用 Go 重新实现 SeedLink 协议，提升系统的可移植性，降低部署成本和难度
- [ ] 下位机的硬件亟待集成化，目前还是一块核心板加上一堆杂七杂八的模块，不够美观
- [ ] 目前项目的低频补偿算法及滤波器非常不完善，需要进一步改进
- [ ] 目前项目的前端只是简单地展示了波形，希望后续加上频谱功能
- [ ] 项目的成本还是有点高，希望能够进一步降低成本
- [ ] 下位机 ADC 稳定性不高，需要进一步改进

# 总体成本

以蓝牙通信的下位机为例，不计入吃灰开发板的成本，单独一套地震站的成本大概在 400 多 CNY，下面是博主购买的部分材料清单。

|        项目名称        | 数量  | 单价（元） | 总价（元） |
| :--------------------: | :---: | :--------: | :--------: |
| LGT-4.5 Hz 水平检波器  |   2   |    100     |    200     |
| LGT-4.5 Hz 垂直检波器  |   1   |    100     |    100     |
| 康威电子 ADS1256 模块  |   1   |    100     |    100     |
|  STM32F103C8T6 核心板  |   1   |     15     |     15     |
| USB 蓝牙驱动器（酌情） |   1   |     15     |     15     |
|  JDY-31-SPP 蓝牙模块   |   1   |     5      |     5      |

# 项目地址

再贴一次项目地址，欢迎大家 Star 和 Fork，同时，项目的使用说明及二次开发文档也将在近期发布，敬请期待。

- [GitHub - bclswl0827/explorer](https://github.com/bclswl0827/explorer)
- [GitHub - bclswl0827/observer](https://github.com/bclswl0827/observer)
