---
title: 优雅地编写寄存器读写驱动，然后惊艳所有人
date: 2024-01-07 18:56:42
categories: "硬件"
tags:
  - 嵌入式
  - 单片机
  - C / C++
  - SPI
  - I2C
---

在博主刚入门单片机时，经常看到其他人写出类似这样的驱动代码。

```cpp
// ... 其他内容
i2c_write_cmd(0xAE);
i2c_write_cmd(0x00);
i2c_write_cmd(0x10);
i2c_write_cmd(0x40);
i2c_write_cmd(0xDA);
i2c_write_cmd(0x1D);
i2c_write_cmd(0xF1);
i2c_write_cmd(0x8D);
i2c_write_cmd(0x14);
i2c_write_cmd(0xA4);
i2c_write_cmd(0xA6);
// ... 其他内容
```

作为小白，看到一大堆的 16 进制数字，自然是一脸懵比，就算看了半天也只能从调用的函数名字勉强猜出这可能是在操作寄存器，但是具体是什么寄存器，写入的值是什么，就不得而知了。

用这种一把梭方式写出的驱动代码，不仅可读性极差，而且一旦需要修改，事情就会变得非常麻烦：由于不清楚每句代码都是在操作哪个寄存器，因此开发者又需要回到 Datasheet 中去查找寄存器的地址，然后再去查看寄存器的功能，最后才能确定要写入的值，这样的开发效率可想而知。时间一长，开发者就会对这个项目产生厌恶情绪，最终导致项目被搁置，而屎山项目代码也就此诞生。

但不幸的是，这种一把梭的方式在很多开源项目中都能看到，因此这也让有强迫症的博主非常不爽。对此，博主决定写一篇文章，以自己的 [AnyShake Explorer 项目开发途中为 ADC 编写驱动](https://github.com/anyshake/explorer/tree/master/firmware)的经历为例，来分享如何才能写出能惊艳到其他人的驱动代码。

<!-- more -->

博主在开发 [AnyShake Explorer](https://github.com/anyshake/explorer/tree/master/firmware) 时，ADC 选型为 TI 家的 ADS1262，这是一款 32 位的 ADC，使用 SPI 协议进行通信，提供 10 个通道。由于网上现成的库实在太少，因此博主只能自己编写驱动。

ADS1262 的 Datasheet 位于 [www.ti.com/lit/ds/symlink/ads1262.pdf](https://www.ti.com/lit/ds/symlink/ads1262.pdf)，其中，芯片寄存器表位于第 88 页，如下图所示。

![ADS1262 芯片寄存器表](https://c.ibcl.us/Register-RW_20240107/1.png)

从表中可以看到，ADS1262 一共有 21 个寄存器（剩下 6 个寄存器为 ADS1263 独占），每一个寄存器中有 8 位的数据。

在寄存器表的下文中，TI 详细介绍了每一个寄存器中每一位的功能、可选值及默认值等资讯，如下图所示。

![ADS1262 芯片寄存器功能介绍](https://c.ibcl.us/Register-RW_20240107/2.png)

以寄存器 `POWER` 为例，其地址为 `0x01`，其中，第 4 位指示芯片是否被复位过，第 1 位控制芯片是否为 AICOM 启用偏置电流，第 0 位控制芯片是否启用内部参考电压，其他位则为保留位，其值必须为 0。

看到这里，或许一些人会想到可以定义下面几个函数来实现对 `POWER` 寄存器的读写。

```cpp
uint8_t ads1262_get_reg_power_bit_reset(void);
uint8_t ads1262_get_reg_power_bit_vbias(void);
uint8_t ads1262_get_reg_power_bit_vref(void);
void ads1262_set_reg_power_bit_reset(uint8_t value);
void ads1262_set_reg_power_bit_vbias(uint8_t value);
void ads1262_set_reg_power_bit_vref(uint8_t value);
```

这种方法的优点是，每一个函数都只负责一个寄存器功能位的读写，因此函数的代码量非常少，而且由于函数名字中已经包含了寄存器与寄存器位的名字，因此函数的可读性也非常好。

但是，这种方法的缺点也非常明显：由于每一个寄存器的功能位都需要编写 2 个函数（get 函数和 set 函数），因此当寄存器功能位数量较多时，这种方法会导致代码量急剧膨胀，而且当需要修改某个寄存器的读写函数时，也需要修改 2 个函数，这样的工作量也是非常大的。

因此，博主认为这种方式并不适合用于编写驱动代码，所以需要寻找一种更好的办法，也就是**仅为寄存器整体编写读写函数**，这样一来，对于每个寄存器整体，只需要编写 2 个函数（同样是 get 函数和 set 函数）即可，而寄存器中的每一个功能位，则将其封装到一个结构体中，调用时取其指针传入函数参数即可。

所以，上述的 `POWER` 寄存器的读写函数接口，博主会这样定义。

```cpp
#define __ADC_POWER_DEFAULT_VALUE 0x11

#define ADC_POWER_RESET_NONE 0x00
#define ADC_POWER_RESET_OCCURRED 0x01

#define ADC_POWER_VBIAS_DISABLED 0x00
#define ADC_POWER_VBIAS_ENABLED 0x01

#define ADC_POWER_INTREF_DISABLED 0x00
#define ADC_POWER_INTREF_ENABLED 0x01

typedef struct {
    // Reset indicator, indicates ADC reset has occurred. Clear this bit to
    // detect the next device reset.
    // 0x00: No reset
    // 0x01: Reset has occurred (default)
    uint8_t reset = 0x01;
    // Level shift voltage enable, enables the internal level shift voltage to
    // the AINCOM pin.
    // 0x00: Disabled (default),
    // 0x01: Enabled
    uint8_t vbias = 0x00;
    // Internal reference enable, enables the internal reference voltage. Note
    // the IDAC and temperature sensor require the internal voltage reference.
    // 0x00: Disabled
    // 0x01: Enabled (default)
    uint8_t intref = 0x01;
} adc_reg_power_t;

void adc_reg_set_power(adc_reg_power_t* power);
void adc_reg_get_power(adc_reg_power_t* power);
```

至于上述定义中读写函数的实现，实际上也非常简单，只需要将结构体中的每一个成员变量的值写入到寄存器中，或者将寄存器中的值读取到结构体中即可。

例如写入函数的实现，如下所示。

```cpp
void adc_reg_set_power(adc_reg_power_t* power) {
    uint8_t power_data = __ADC_POWER_DEFAULT_VALUE;
    power_data &= ~(0x01 << 4);
    power_data |= (power->reset & 0x01) << 4;
    power_data &= ~(0x01 << 1);
    power_data |= (power->vbias & 0x01) << 1;
    power_data &= ~0x01;
    power_data |= power->intref & 0x01;
    adc_write_reg(ADC_REG_POWER, &power_data);
}
```

在这段函数中，寄存器默认值（可从 Datasheet 中获得）先被写入到 `power_data` 变量中，然后再将结构体中的每一个成员变量的值按位写入到 `power_data` 变量中，最后再将 `power_data` 变量的值写入到寄存器中。

而读取函数的实现，如下所示。

```cpp
void adc_reg_get_power(adc_reg_power_t* power) {
    uint8_t power_data = 0;
    adc_read_reg(ADC_REG_POWER, &power_data);
    power->reset = (power_data & 0x10) >> 4;
    power->vbias = (power_data & 0x02) >> 1;
    power->intref = power_data & 0x01;
}
```

在这段函数中，首先从寄存器中读取数据到 `power_data` 变量中，然后再将 `power_data` 变量的值按位写入到结构体中。

这样一来，每个寄存器的功能位数量就不再影响函数的数量，而且当需要修改某个寄存器的读写函数时，也只需要修改 2 个函数，这样的工作量也是非常小的。而且，这样的代码更加具有可读性，维护起来也更加方便。

另外，博主还尽量保持了驱动代码的可移植性，例如，对于 SPI 通信，博主并未使用 Arduino 提供的 `spi_transfer()` 函数，或是 STM32 提供的 `HAL_SPI_Transmit()` 函数，而是自行对其重新进行了封装，因此才有了 `adc_write_reg()` 函数和 `adc_read_reg()` 函数。若是需要移植到其他平台，也只需要修改这两个函数即可。

值得一提的是，在 Linux 内核中的驱动代码中，大多数寄存器的读写函数接口都是用类似的方式编写的，博主的灵感也正是来自于此。

至于这套完整的 ADS1262 驱动代码，可以在 [AnyShake Explorer 项目的 firmware 目录中找到](https://github.com/anyshake/explorer/tree/master/firmware)，欢迎大家批评指正。
