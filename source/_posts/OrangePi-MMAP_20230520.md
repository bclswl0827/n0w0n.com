---
title: Orange Pi 使用 mmap 控制 GPIO
date: 2023-05-20 13:08:00
categories: "Linux"
tags:
  - Linux
  - Orange Pi
  - Rapsberry Pi
  - MMAP
  - GPIO
  - 硬件
  - 嵌入式
---

博主曾经接手的一个项目，主控板连续好几年使用的一直是 Rapsberry Pi，但是随着 Raspberry Pi 价格长期居高不下，让人直呼伤不起，只能考虑把板子换成更便宜的方案，在权衡之下，博主最后选了 Orange Pi One。

Orange Pi One 使用了 Allwinner H3 作为 CPU，内建 512 MB 运存，对于博主的项目来说绰绰有余，另外，Orange Pi One 的 GPIO 定义和 Raspberry Pi 相同，而且闲鱼上的售价普遍 70 左右，和树莓派现在的售价比起来，直接少了个 0，让人很难不心动。

悲催的是，这个项目就用到了 Raspberry Pi 的 GPIO，而且原本的代码中，而且没有用外部库去操作 GPIO，只是使用了**内存映射**的方式，透过读写内存来操作 GPIO。

我们知道，不同的 CPU 之间，内部的寄存器集合与地址也都会有所不同，所以在博主想碰碰运气，尝试过直接换板子，发现果然运行不了之后，博主只能很不情愿地改代码去了。

这篇文章将会介绍博主如何理解 mmap 的概念，如何看懂 Allwinner H3 提供的 Datasheet，以及如何成功编写程序控制 GPIO 的一整套流程，希望能对您有所帮助。

![博主的 Orange Pi One](https://c.ibcl.us/OrangePi-MMAP_20230520/1.jpg)

<!-- more -->

# 为什么要用 mmap

简单来说，mmap 可以透过将一片物理内存空间映射到应用的虚拟内存空间，这样一来，我们就能直接在应用层就能操作 CPU 的寄存器。

在常规的开发中，我们通常会用 Linux 通用的 sysfs 方式去控制 GPIO，使 GPIO 输出指定的电平，或是从 GPIO 读取外部向 GPIO 输入的电平。

但是，这种方法只适合于一般对速度要求不高的场合，在需要高速访问 GPIO 的场合，这种方式还是比较吃力的。这是因为 sysfs 是透过文件 IO 操作进行 GPIO 控制，每次操作都需要进行文件系统的访问和系统调用，这都会引入一定的性能开销。

所以，若要破除额外的性能开销，突破文件 IO 瓶颈，那就需要想办法绕过它们，而 nmap 这种方法可以直接在物理内存中进行 GPIO 相关操作，按理说可以实现更快速的 GPIO 访问速度。

# mmap 控制 GPIO 的原理

我们知道，开发板上的 GPIO 实际上就是 CPU 上的一部分引脚，由于这一部分引脚可以透过程序控制，那么 CPU 内必然有与之对应的寄存器，那么也就必然有与之对应的物理地址区段，同时这个区段是不会改变的。而我们可以透过 mmap 操作 CPU 内部寄存器，那么就可以透过这种方式控制指定的 GPIO。

要透过 mmap 控制 GPIO，流程有如下 5 步。

 1. 打开 `/dev/mem` 装置文件
 2. 确定 GPIO 控制寄存器的物理地址
 3. 使用 mmap 映射物理地址到用户空间
 4. 访问 GPIO 控制寄存器
 5. 取消 mmap 映射

在这 5 步中，第 2 步需要查阅 CPU 厂商所提供的 Datasheet 来确定。

# 查阅 Allwinner H3 Datasheet

透过 Google，博主找到了 [Allwinner H3 的 Datasheet](https://dl.linux-sunxi.org/H3/Allwinner_H3_Datasheet_V1.0.pdf)。由于 Datasheet 有惊人的 618 页，不可能每页都看完，我们只需要按下 Ctrl + F 搭配搜索如下关键词即可。

 - Base Address：基础地址
 - Register：寄存器

在第 90 页 4.3.4. Register List 位置，我们得知，**CPU 内所有寄存器基础地址为 0x01C20000**；继续搜索后，在 318 页 4.22.1. Port Controller Register List 位置，可以了解到 Allwinner H3 的 **GPIO 寄存器基础地址为 0x01C20800**。由此，我们可以得出结论，**GPIO 寄存器基础地址**相对于 **CPU 内所有寄存器基础地址**的偏移量为 0x0800。

接下来，我们需要知道 GPIO 寄存器的具体配置。在 318 页 4.22.2. Port Controller Register 位置，我们可以看到寄存器表格，去除中断引脚，对于我们有用的寄存器配置如下。

| 寄存器名称 | 寄存器偏移    | 寄存器描述                                              | 博主注                                                           |
| :--------- | :------------ | :------------------------------------------------------ | :--------------------------------------------------------------- |
| Pn_CFG0    | n*0x24 + 0x00 | GPIO n 配置寄存器 0，用于配置 GPIO n 的模式             | 先确定好要设定 GPIO 模式的端口号（如 GPIO_A）以及管脚号（如 A6） |
| Pn_CFG1    | n*0x24 + 0x04 | GPIO n 配置寄存器 1，用于配置 GPIO n 的模式             | 然后在 Datasheet 中此表格后续的 Pn Configure Register x 表中     |
| Pn_CFG2    | n*0x24 + 0x08 | GPIO n 配置寄存器 2，用于配置 GPIO n 的模式             | n = [0...6]，x = [1...3] 找到确切管脚对应之「位」与模式之「值」  |
| Pn_CFG3    | n*0x24 + 0x0C | GPIO n 配置寄存器 3，用于配置 GPIO n 的模式             | （上文提及之代号 n 亦指代 GPIO 端口号 A、C、D、E、F、G、L 之一） |
| Pn_DAT     | n*0x24 + 0x10 | GPIO n 数据寄存器，用于存取 GPIO n 的状态               | 输入模式时对应位表示引脚状态；输出模式时引脚状态与对应位相同     |
| Pn_DRV0    | n*0x24 + 0x14 | GPIO n 驱动能力寄存器 0，用于配置 GPIO n 的驱动能力     |                                                                  |
| Pn_DRV1    | n*0x24 + 0x18 | GPIO n 驱动能力寄存器 1，用于配置 GPIO n 的驱动能力     |                                                                  |
| Pn_PUL0    | n*0x24 + 0x1C | GPIO n 上拉电阻控制寄存器 0，用于配置 GPIO n 的上拉电阻 |                                                                  |
| Pn_PUL1    | n*0x24 + 0x20 | GPIO n 上拉电阻控制寄存器 1，用于配置 GPIO n 的上拉电阻 |                                                                  |

此外，虽然我们知道了 GPIO 的寄存器基础地址为 0x01C20800，但是我们要控制的 GPIO 是 GPIO_A，所以我们还需要知道 GPIO_A 相对于 GPIO 寄存器基础地址的偏移量。

继续翻阅 Datasheet，我们可以在 319 页 4.22.2.1. PA Configure Register 0 位置了解到，GPIO_A 端口寄存器相对于 GPIO 寄存器基础地址的偏移量为 0x00，同时 GPIO_A 端口寄存器的所有配置结束于 0x01C20820，位宽 0x20 为字节。

综上，我们可以用一个结构体类型 `gpio_t` 来描述上述寄存器。

```C
typedef struct {
    volatile uint32_t config[4];
    volatile uint32_t data;
    volatile uint32_t driver[2];
    volatile uint32_t pull[2];
} gpio_t;
```

在这个结构体中，`volatile` 关键字用于告诉编译器，这个结构体中的成员变量可能会被其他线程或者中断修改，所以编译器不要对这个结构体进行优化。

了解了 GPIO 寄存器的配置，我们可以透过一个实例来说明如何配置 GPIO。例如，我们要控制 GPIO_A20 为输出模式，并输出高电平，我们需要得知以下几条与 GPIO_A20 相关的资讯。

 1. GPIO_A20 的配置位于 PA_CFG2_REG 寄存器中第 20-22 位，其值为 0x01 时为输出模式
 2. 当 PA_DATA_REG 寄存器第 20 位值为 1 时，即可输出高电平

# 编程解决问题

博主将以 C 语言、Go 语言与 Python 为例，透过 mmap 操作 GPIO，实现 GPIO_A21 管脚带动 LED 灯闪烁，同时读取 GPIO_A20 管脚电平的功能。

## C 语言版本

以下是 C 语言的版本，其中，`gpio_t` 结构体的定义与上文相同，`set_output` 函数用于将 GPIO 端口设置为输出模式，`set_input` 函数用于将 GPIO 端口设置为输入模式，`set_level` 函数用于设定 GPIO 端口电平，`get_level` 函数用于读取 GPIO 端口的电平。

```C
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <unistd.h>

// GPIO_A 配置寄存器列表
// { 寄存器号, 寄存器位 }
const int GPIO_A_CONFIG[22][2] = {
    {0, 0}, // PA0
    {0, 4}, // PA1
    {0, 8}, // PA2
    {0, 12}, // PA3
    {0, 16}, // PA4
    {0, 20}, // PA5
    {0, 24}, // PA6
    {0, 28}, // PA7

    {1, 0}, // PA8
    {1, 4}, // PA9
    {1, 8}, // PA10
    {1, 12}, // PA11
    {1, 16}, // PA12
    {1, 20}, // PA13
    {1, 24}, // PA14
    {1, 28}, // PA15

    {2, 0}, // PA16
    {2, 4}, // PA17
    {2, 8}, // PA18
    {2, 12}, // PA19
    {2, 16}, // PA20
    {2, 20}, // PA21
};

// 寄存器基础地址
#define ALLWINNER_H3_BASE 0x01C20000
// GPIO_A 相对于 ALLWINNER_H3_BASE 偏移量
#define GPIO_PA_OFFSET 0x0800
// 指定在使用 mmap 函数时要映射的区域大小
#define MMAP_SIZE 0x1000
// GPIO 模式设定
enum GPIO_MODE {
    INPUT = 0, OUTPUT,
};
// GPIO 电平设定
enum GPIO_LEVEL {
    LOW = 0, HIGH,
};

// GPIO 端口寄存器类型
typedef struct {
  volatile uint32_t config[4];
  volatile uint32_t data;
  volatile uint32_t driver[2];
  volatile uint32_t pull[2];
} gpio_t;

// 配置 GPIO_A 的指定管脚为输出模式
void set_output(gpio_t *gpio, int pin) {
    // 取得寄存器号与寄存器位
    int reg = GPIO_A_CONFIG[pin][0];
    int bit = GPIO_A_CONFIG[pin][1];
    // 清空原有配置
    gpio->config[reg] &= ~(0xF << bit);
    // 设为输出模式
    gpio->config[reg] |= (OUTPUT << bit);
}

// 配置 GPIO_A 的指定管脚为输入模式
void set_input(gpio_t *gpio, int pin) {
    // 取得寄存器号与寄存器位
    int reg = GPIO_A_CONFIG[pin][0];
    int bit = GPIO_A_CONFIG[pin][1];
    // 清空原有配置
    gpio->config[reg] &= ~(0xF << bit);
    // 设为输入模式
    gpio->config[reg] |= (INPUT << bit);
}

// 设定 GPIO_A 的指定管脚电平
void set_level(gpio_t *gpio, int pin, int level) {
    switch (level) {
        case HIGH:
            gpio->data |= (1 << pin);
            return;
        case LOW:
            gpio->data &= ~(1 << pin);
            return;
        defaults:
            return;
    }
}

// 读取 GPIO_A 的指定管脚电平
int get_level(gpio_t *gpio, int pin) {
    // 取得寄存器号与寄存器位
    int reg = GPIO_A_CONFIG[pin][0];
    int bit = GPIO_A_CONFIG[pin][1];
    // 清空原有配置
    gpio->config[reg] &= ~(0xF << bit);
    return (gpio->data >> pin) & 0x01;
}

int main() {
    // 以读写模式打开 /dev/mem 装置文件
    int mem = open("/dev/mem", O_RDWR | O_SYNC);
    if (mem < 0) {
        perror("open /dev/mem");
        return -1;
    }

    // 将寄存器映射到内存
    char *reg = (char *)mmap(NULL, MMAP_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, mem, ALLWINNER_H3_BASE);
    if (reg == MAP_FAILED) {
        perror("mmap");
        close(mem);
        return -1;
    }

    // 将映射的地址偏移量应用于 GPIO_A 寄存器类型
    gpio_t *gpio = (gpio_t *)&reg[GPIO_PA_OFFSET];

    // 设定 GPIO_A21 为输出模式
    set_output(gpio, 21);
    // 设定 GPIO_A20 为输入模式
    set_input(gpio, 20);

    // 闪烁 LED 灯并读取电平
    for (;;) {
        // 闪烁 GPIO_A21 LED
        set_level(gpio, 21, HIGH);
        usleep(500000);
        set_level(gpio, 21, LOW);
        usleep(500000);
        // 读取 GPIO_A20 电平并打印
        int level = get_level(gpio, 20);
        printf("GPIO_A20 level: %d\n", level);
    }

    // 解除内存映射
    munmap(gpio, MMAP_SIZE);
    close(mem);

    return 0;
}
```

## Go 语言版本

作为一个 Gopher，当然也要用 Go 语言来实现一遍了。

在 Go 语言的版本中，内存映射使用了 `syscall.Mmap()` 和 `syscall.Munmap()` 函数。

此外，在之前的 C 代码中，使用了强制类型转换 `(gpio_t *)` 和解引用运算符 `*` 来进行指针转换，而在 Go 版本的实现中，指针转换是使用 `unsafe.Pointer` 类型与 `unsafe.Pointer()` 函数来进行指针转换，从而实现了直接操作内存地址。

```go
package main

import (
	"fmt"
	"os"
	"syscall"
	"time"
	"unsafe"
)

// GPIO_A 配置寄存器列表
// { 寄存器号, 寄存器位 }
var GPIO_A_CONFIG = [22][2]int{
	{0, 0},  // PA0
	{0, 4},  // PA1
	{0, 8},  // PA2
	{0, 12}, // PA3
	{0, 16}, // PA4
	{0, 20}, // PA5
	{0, 24}, // PA6
	{0, 28}, // PA7

	{1, 0},  // PA8
	{1, 4},  // PA9
	{1, 8},  // PA10
	{1, 12}, // PA11
	{1, 16}, // PA12
	{1, 20}, // PA13
	{1, 24}, // PA14
	{1, 28}, // PA15

	{2, 0},  // PA16
	{2, 4},  // PA17
	{2, 8},  // PA18
	{2, 12}, // PA19
	{2, 16}, // PA20
	{2, 20}, // PA21
}

const (
	// 寄存器基础地址
	ALLWINNER_H3_BASE = 0x01C20000
	// GPIO_A 相对于 ALLWINNER_H3_BASE 偏移量
	GPIO_PA_OFFSET = 0x0800
	// 指定在使用 mmap 函数时要映射的区域大小
	MMAP_SIZE = 0x1000
)

// GPIO 模式设定
const (
	INPUT  = 0
	OUTPUT = 1
)

// GPIO 电平设定
const (
	LOW  = 0
	HIGH = 1
)

// GPIO 端口寄存器类型
type gpio_t struct {
	config [4]uint32
	data   uint32
	driver [2]uint32
	pull   [2]uint32
}

func setOutput(gpio *gpio_t, pin int) {
	// 取得寄存器号与寄存器位
	reg := GPIO_A_CONFIG[pin][0]
	bit := GPIO_A_CONFIG[pin][1]
	// 清空原有配置
	gpio.config[reg] &= ^(0xF << bit)
	// 设为输出模式
	gpio.config[reg] |= OUTPUT << bit
}

func setInput(gpio *gpio_t, pin int) {
	// 取得寄存器号与寄存器位
	reg := GPIO_A_CONFIG[pin][0]
	bit := GPIO_A_CONFIG[pin][1]
	// 清空原有配置
	gpio.config[reg] &= ^(0xF << bit)
	// 设为输入模式
	gpio.config[reg] |= INPUT << bit
}

func setLevel(gpio *gpio_t, pin, level int) {
	switch level {
	case HIGH:
		gpio.data |= 1 << pin
	case LOW:
		gpio.data &= ^(1 << pin)
	}
}

func getLevel(gpio *gpio_t, pin int) int {
	// 取得寄存器号与寄存器位
	reg := GPIO_A_CONFIG[pin][0]
	bit := GPIO_A_CONFIG[pin][1]
	// 清空原有配置
	gpio.config[reg] &= ^(0xF << bit)
	return int((gpio.data >> pin) & 0x01)
}

func main() {
	// 以读写模式打开 /dev/mem 装置文件
	mem, err := os.OpenFile("/dev/mem", os.O_RDWR|os.O_SYNC, 0)
	if err != nil {
		fmt.Printf("Failed to open /dev/mem: %v\n", err)
		return
	}
	defer mem.Close()

	// 将寄存器映射到内存
	reg, err := syscall.Mmap(int(mem.Fd()), ALLWINNER_H3_BASE, MMAP_SIZE, syscall.PROT_READ|syscall.PROT_WRITE, syscall.MAP_SHARED)
	if err != nil {
		fmt.Printf("Failed to mmap: %v\n", err)
		return
	}
	defer syscall.Munmap(reg)

	// 将映射的地址偏移量应用于 GPIO_A 寄存器类型
	gpio := (*gpio_t)(unsafe.Pointer(&reg[GPIO_PA_OFFSET]))

	// 设定 GPIO_A21 为输出模式
	setOutput(gpio, 21)
	// 设定 GPIO_A20 为输入模式
	setInput(gpio, 20)

	// 闪烁 LED 灯并读取电平
	for {
		// 闪烁 GPIO_A21 LED
		setLevel(gpio, 21, HIGH)
		time.Sleep(time.Second)
		setLevel(gpio, 21, LOW)
		time.Sleep(time.Second)
		// 读取 GPIO_A20 电平并打印
		level := getLevel(gpio, 20)
		fmt.Printf("GPIO_A20 level: %d\n", level)
	}
}
```

## Python 版本

Python 版本的实现与 Go 版本的实现类似，不过在 Python 中，内存映射使用了 `mmap` 模块。

```python
import ctypes
import mmap
import os
import time

# GPIO_A 配置寄存器列表
# { 寄存器号, 寄存器位 }
GPIO_A_CONFIG = [
    [0, 0],  # PA0
    [0, 4],  # PA1
    [0, 8],  # PA2
    [0, 12],  # PA3
    [0, 16],  # PA4
    [0, 20],  # PA5
    [0, 24],  # PA6
    [0, 28],  # PA7
    [1, 0],  # PA8
    [1, 4],  # PA9
    [1, 8],  # PA10
    [1, 12],  # PA11
    [1, 16],  # PA12
    [1, 20],  # PA13
    [1, 24],  # PA14
    [1, 28],  # PA15
    [2, 0],  # PA16
    [2, 4],  # PA17
    [2, 8],  # PA18
    [2, 12],  # PA19
    [2, 16],  # PA20
    [2, 20],  # PA21
]

# 寄存器基础地址
ALLWINNER_H3_BASE = 0x01C20000
# GPIO_A 相对于 ALLWINNER_H3_BASE 偏移量
GPIO_PA_OFFSET = 0x0800
# 指定在使用 mmap 函数时要映射的区域大小
MMAP_SIZE = 0x1000
# GPIO 模式设定
INPUT = 0
OUTPUT = 1
# GPIO 电平设定
LOW = 0
HIGH = 1


# 配置 GPIO_A 的指定管脚为输出模式
def set_output(gpio, pin):
    # 取得寄存器号与寄存器位
    reg, bit = GPIO_A_CONFIG[pin]
    # 清空原有配置
    gpio.config[reg] &= ~(0xF << bit)
    # 设为输出模式
    gpio.config[reg] |= (OUTPUT << bit)


# 配置 GPIO_A 的指定管脚为输入模式
def set_input(gpio, pin):
    # 取得寄存器号与寄存器位
    reg, bit = GPIO_A_CONFIG[pin]
    # 清空原有配置
    gpio.config[reg] &= ~(0xF << bit)
    # 设为输入模式
    gpio.config[reg] |= (INPUT << bit)


# 设定 GPIO_A 的指定管脚电平
def set_level(gpio, pin, level):
    if level == HIGH:
        gpio.data |= (1 << pin)
    elif level == LOW:
        gpio.data &= ~(1 << pin)


# 读取 GPIO_A 的指定管脚电平
def get_level(gpio, pin):
    # 取得寄存器号与寄存器位
    reg, bit = GPIO_A_CONFIG[pin]
    # 清空原有配置
    gpio.config[reg] &= ~(0xF << bit)
    return (gpio.data >> pin) & 0x01


def main():
    # 以读写模式打开 /dev/mem 装置文件
    mem = os.open("/dev/mem", os.O_RDWR | os.O_SYNC)
    if mem < 0:
        print("Failed to open /dev/mem")
        return

    # 将寄存器映射到内存
    reg = mmap.mmap(mem, MMAP_SIZE, mmap.MAP_SHARED, mmap.PROT_READ | mmap.PROT_WRITE, offset=ALLWINNER_H3_BASE)

    # GPIO 端口寄存器类型
    class gpio_t(ctypes.Structure):
        _fields_ = [
            ("config", ctypes.c_uint32 * 4),
            ("data", ctypes.c_uint32),
            ("driver", ctypes.c_uint32 * 2),
            ("pull", ctypes.c_uint32 * 2),
        ]

    gpio = gpio_t.from_buffer(reg, GPIO_PA_OFFSET)

    # 设定 GPIO_A21 为输出模式
    set_output(gpio, 21)
    # 设定 GPIO_A20 为输入模式
    set_input(gpio, 20)

    # 闪烁 LED 灯并读取电平
    while True:
        # 闪烁 GPIO_A21 LED
        set_level(gpio, 21, HIGH)
        time.sleep(0.5)
        set_level(gpio, 21, LOW)
        time.sleep(0.5)
        # 读取 GPIO_A20 电平并打印
        level = get_level(gpio, 20)
        print("GPIO_A20 level:", level)

    # 解除内存映射
    reg.close()
    os.close(mem)


if __name__ == "__main__":
    main()
```

# 效果展示

![闪烁的 LED](https://c.ibcl.us/OrangePi-MMAP_20230520/2.gif)

![读取 GPIO_A20 电平](https://c.ibcl.us/OrangePi-MMAP_20230520/3.png)
