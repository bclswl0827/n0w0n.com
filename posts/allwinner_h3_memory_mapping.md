---
title: "MMAP on Allwinner H3  - The faster way to access to GPIO pins"
date: "2023-05-20 13:08:00 +0800"
---

When it comes to control the GPIO pins on a development board, many of developers have tried to access the GPIO pins from the user space (e.g. The `sysfs`). But this approach may not perform well because it's not that fast as you may thought - at least it was vividly reflected in one of my recent needs.

Recently I took over a maker-level project that uses the Raspberry Pi and in the project, the Pi needs to continuously poll the level of a certain output from the FPGA at high speed to determine whether the data is "ready". However, as the price of Raspberry Pi rises, I had to consider the affordable alternative, finally I settled on the Orange Pi One, which uses the Allwinner H3 and has a 512 MB of RAM - That's enough for my needs.

In the original Raspberry Pi implementation for the project, the state of the GPIO pins was obtained directly by accessing the GPIO registers - the memory mapping (mmap), and we know that different SOCs have different internal register sets and addresses, so to port the project to the Allwinner H3, some significant changes in the code were required.

This article will introduce how I understand the concept of mmap, and how did I analyse the datasheet provided by Allwinner, in the last, I'll provide a complete example of how to use mmap to access GPIO pins in C, Go, and Python.

![Orange Pi One](https://assets.n0w0n.com/allwinner_h3_memory_mapping/1.jpg)

<!-- more -->

## The Concept of MMAP

In simple terms, mmap allows a physical memory region to be mapped to the application's virtual memory space. This enables direct manipulation of CPU registers at the application level.

In conventional development, we typically use the Linux generic sysfs interface to control GPIOs. Through this interface, GPIOs can be configured to output specific signal levels or read external signals input to the GPIO. However, this method is only suitable for scenarios where speed requirements are not stringent. When high-speed GPIO access is required, the sysfs method becomes inefficient. This is because sysfs relies on file I/O operations for GPIO control. Each operation involves accessing the file system and making system calls, which introduces performance overhead.

To eliminate this additional performance cost and break through the file I/O bottleneck, an alternative approach is to bypass these layers. The mmap method allows direct operations on GPIOs in physical memory, theoretically achieving faster GPIO access.

## The Principle of Controlling

It is known that the GPIOs on a development board are essentially part of the CPU pins. Since these pins can be controlled programmatically, there must be corresponding registers within the CPU. These registers are mapped to specific physical address ranges that remain constant. By using mmap to operate on the CPU's internal registers, it becomes possible to control specific GPIOs in this manner.

To control GPIOs via mmap, the process involves the following 5 steps:

1. Open the `/dev/mem` device file.
2. Determine the physical address of the GPIO control registers.
3. Use mmap to map the physical address to user space.
4. Access the GPIO control registers.
5. Unmap the mmap region.

Among these steps, step 2 requires consulting the CPU vendor's datasheet to identify the relevant details.

## Consulting the Datasheet

[The datasheet](https://dl.linux-sunxi.org/H3/Allwinner_H3_Datasheet_V1.0.pdf), provided by Allwinner is an extensive 618 pages, making it impractical to read in full. Instead, relevant sections can be found by using Ctrl + F to search for the following keywords:

- Base Address: Identifies the base address.
- Register: Provides details on the registers.

And the key findings from the datasheet are given as follows:

- CPU Base Address: On page 90, section 4.3.4, Register List, it is mentioned that the base address for all CPU registers is `0x01C20000`.
- GPIO Base Address: On page 318, section 4.22.1, Port Controller Register List, it is noted that the GPIO base address is `0x01C20800`.
- The offset between the CPU base address and the GPIO base address is therefore `0x0800`.

on page 318, section 4.22.2, at Port Controller Register, the GPIO register configurations are detailed. After excluding interrupt-related registers, the useful registers for GPIO configuration are as follows:

| Register | Offset         | Description                                                                                    | Remarks                                                                                                                            |
| :------- | :------------- | :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| Pn_CFG0  | n\*0x24 + 0x00 | GPIO_n configuration register 0 for setting up pin mode                                     | First determine the port number (e.g. GPIO_A) and pin number (e.g. 6) for which you want to set the GPIO mode.                     |
| Pn_CFG1  | n\*0x24 + 0x04 | GPIO_n configuration register 1 for setting up pin mode                                     | Then in the P<u>n</u> Configure Register <u>x</u> table following this table in the Datasheet, where n = [0...6] and x = [0...3],  |
| Pn_CFG2  | n\*0x24 + 0x08 | GPIO_n configuration register 2 for setting up pin mode                                     | find the corresponding "bit" and "value" for the GPIO mode you want to set.                                                        |
| Pn_CFG3  | n\*0x24 + 0x0C | GPIO_n configuration register 3 for setting up pin mode                                     | (The code n mentioned above also refers to one of the GPIO port numbers A, C, D, E, F, G, L)                                       |
| Pn_DAT   | n\*0x24 + 0x10 | GPIO_n data register for accessing the state of GPIO pin                                    | In input mode, the corresponding bit indicates the pin status; in output mode, the pin status is the same as the corresponding bit |
| Pn_DRV0  | n\*0x24 + 0x14 | GPIO_n drive capability register 0, used to configure the output drive capability of GPIO n |                                                                                                                                    |
| Pn_DRV1  | n\*0x24 + 0x18 | GPIO_n drive capability register 1, used to configure the output drive capability of GPIO n |                                                                                                                                    |
| Pn_PUL0  | n\*0x24 + 0x1C | GPIO_n Pull-up / Pull-down register 0, used to configure the pull-up / pull-down of GPIO n  |                                                                                                                                    |
| Pn_PUL1  | n\*0x24 + 0x20 | GPIO_n Pull-up / Pull-down register 1, used to configure the pull-up / pull-down of GPIO n  |                                                                                                                                    |

Although we know the GPIO register base address is `0x01C20800`, specific ports like GPIO_A require knowledge of their offset from the GPIO base address.

From page 319 of the datasheet, section 4.22.2.1 (PA Configure Register 0), we learn: GPIO_A registers start at an offset of 0x00 relative to the GPIO base address, the configuration for GPIO_A registers ends at `0x01C20820`, with a total width of 0x20 bytes.

Given this layout, the following C structure can represent the GPIO register set:

```cpp
typedef struct {
    volatile uint32_t config[4];
    volatile uint32_t data;
    volatile uint32_t driver[2];
    volatile uint32_t pull[2];
} gpio_t;
```

In this structure, the keyword `volatile` tells the compiler that the member variables of this structure may be modified by other threads or interrupts, so the compiler should not optimize this structure.

## Some Examples

### Example 1: Configure GPIO_A20 as an Output and Set High

To configure GPIO_A20 as an output and drive it high, refer to the following details from the datasheet:

1. GPIO_A20's configuration is located in the PA_CFG2_REG register (bits 20–22). Set its value to `0x01` to configure it as an output.
2. To output a high signal, set bit 20 in the PA_DATA_REG register to `0x01`.

### Example 2: Configure GPIO_A8 as an Input with Pull-Up Enabled

To configure GPIO_A8 as an input and enable the pull-up resistor, refer to the following details from the datasheet:

1. GPIO_A8's configuration is located in the PA_CFG1_REG register (bits 0–2). Set its value to `0x00` to configure it as an input.
2. To enable the pull-up resistor, set bits 16–17 in the PA_PULL0_REG register to `0x01`.

## Practical Demonstration

With the foundational knowledge covered, we can now write programs to solve the problem.

These examples demonstrates how to use C, Go, and Python to control GPIO_A21 to toggle an LED and read the level of GPIO_A8. The level of GPIO_A8 is printed to the terminal.

Note: Since GPIO_A8 has pull-up enabled, its default level is high unless the pin is grounded. Similarly, if pull-down is enabled, the default level will be low unless connected to power supply.

### The C Implementation

Here is the C version, where the `gpio_t` structure is the same as defined earlier. The `set_output` function configures the GPIO pin as output mode, the `set_input` function configures the GPIO pin as input mode, the `set_level` function sets the GPIO pin level, and the `get_level` function reads the GPIO pin level.

```cpp
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <unistd.h>

// GPIO_A configuration register list
// { Register number, Register bit }
const int GPIO_A_CONFIG[22][2] = {
    {0, 0},   // PA0
    {0, 4},   // PA1
    {0, 8},   // PA2
    {0, 12},  // PA3
    {0, 16},  // PA4
    {0, 20},  // PA5
    {0, 24},  // PA6
    {0, 28},  // PA7

    {1, 0},   // PA8
    {1, 4},   // PA9
    {1, 8},   // PA10
    {1, 12},  // PA11
    {1, 16},  // PA12
    {1, 20},  // PA13
    {1, 24},  // PA14
    {1, 28},  // PA15

    {2, 0},   // PA16
    {2, 4},   // PA17
    {2, 8},   // PA18
    {2, 12},  // PA19
    {2, 16},  // PA20
    {2, 20},  // PA21
};

// Base address of registers
#define ALLWINNER_H3_BASE 0x01C20000
// Offset of GPIO_A relative to ALLWINNER_H3_BASE
#define GPIO_PA_OFFSET 0x0800
// Size of the memory region to be mapped using mmap
#define MMAP_SIZE 0x1000

// GPIO mode configuration
enum GPIO_MODE {
    INPUT = 0,
    OUTPUT,
};
// GPIO level configuration
enum GPIO_LEVEL {
    LOW = 0,
    HIGH,
};
// GPIO pull-up/pull-down configuration
enum GPIO_PULL {
    PULL_OFF = 0,
    PULL_UP,
    PULL_DOWN,
};

// GPIO port register type
typedef struct {
    volatile uint32_t config[4];
    volatile uint32_t data;
    volatile uint32_t driver[2];
    volatile uint32_t pull[2];
} gpio_t;

// Configure the specified pin of GPIO_A as output
void set_output(gpio_t* gpio, int pin) {
    // Get the register number and register bit
    int reg = GPIO_A_CONFIG[pin][0];
    int bit = GPIO_A_CONFIG[pin][1];
    // Clear the previous configuration
    gpio->config[reg] &= ~(0x0F << bit);
    // Set as output mode
    gpio->config[reg] |= (OUTPUT << bit);
}

// Configure the specified pin of GPIO_A as input
void set_input(gpio_t* gpio, int pin) {
    // Get the register number and register bit
    int reg = GPIO_A_CONFIG[pin][0];
    int bit = GPIO_A_CONFIG[pin][1];
    // Clear the previous configuration
    gpio->config[reg] &= ~(0x0F << bit);
    // Set as input mode
    gpio->config[reg] |= (INPUT << bit);
}

// Configure pull-up/pull-down for the specified pin of GPIO_A
void set_pull(gpio_t* gpio, int pin, int pull) {
    // Get the register number
    int reg = pin / 16;
    // Get the register bit
    int bit = (pin % 16) * 2;
    // Clear the previous configuration
    gpio->pull[reg] &= ~(0x03 << bit);
    // Set pull-up/pull-down configuration
    gpio->pull[reg] |= (uint32_t)pull << bit;
}

// Set the level of the specified pin of GPIO_A
void set_level(gpio_t* gpio, int pin, int level) {
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

// Read the level of the specified pin of GPIO_A
int get_level(gpio_t* gpio, int pin) {
    // Get the register number and register bit
    int reg = GPIO_A_CONFIG[pin][0];
    int bit = GPIO_A_CONFIG[pin][1];
    // Clear the previous configuration
    gpio->config[reg] &= ~(0x0F << bit);
    return (gpio->data >> pin) & 0x01;
}

int main() {
    // Open /dev/mem device file in read-write mode
    int mem = open("/dev/mem", O_RDWR | O_SYNC);
    if (mem < 0) {
        perror("open /dev/mem");
        return -1;
    }

    // Map the register into memory
    char* reg = (char*)mmap(NULL, MMAP_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED,
                            mem, ALLWINNER_H3_BASE);
    if (reg == MAP_FAILED) {
        perror("mmap");
        close(mem);
        return -1;
    }

    // Apply the offset to the GPIO_A register type
    gpio_t* gpio = (gpio_t*)&reg[GPIO_PA_OFFSET];

    // Set GPIO_A21 as output
    set_output(gpio, 21);
    // Set GPIO_A8 as input
    set_input(gpio, 8);
    // Enable pull-up for GPIO_A8
    set_pull(gpio, 8, PULL_UP);

    // Blink the LED and read the level
    for (;;) {
        // Toggle GPIO_A21 LED
        set_level(gpio, 21, HIGH);
        usleep(500000);
        set_level(gpio, 21, LOW);
        usleep(500000);
        // Read and print the level of GPIO_A8
        int level = get_level(gpio, 8);
        printf("GPIO_A8 level: %d\n", level);
    }

    // Unmap the memory
    munmap(gpio, MMAP_SIZE);
    close(mem);

    return 0;
}
```

### The Go Implementation

Here is the Go language implementation. In this version, memory mapping is performed using the `syscall.Mmap()` and `syscall.Munmap()` functions.

Additionally, unlike the C version where pointer casting is done with (gpio_t \*) and dereferencing operators \*, the Go version uses the `unsafe.Pointer` type and the `unsafe.Pointer()` function for pointer conversion, allowing direct memory address manipulation.

```go
package main

import (
    "fmt"
    "os"
    "syscall"
    "time"
    "unsafe"
)

// GPIO_A configuration register list
// { register number, register bit }
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
    // Base address of registers
    ALLWINNER_H3_BASE = 0x01C20000
    // Offset of GPIO_A relative to ALLWINNER_H3_BASE
    GPIO_PA_OFFSET = 0x0800
    // Size of the region to be mapped when using the mmap function
    MMAP_SIZE = 0x1000
)

// GPIO mode configuration
const (
    INPUT  = 0
    OUTPUT = 1
)

// GPIO level configuration
const (
    LOW  = 0
    HIGH = 1
)

// Pull-up/down configuration
const (
    PULL_OFF  = 0
    PULL_UP   = 1
    PULL_DOWN = 2
)

// GPIO port register type
type gpio_t struct {
    config [4]uint32
    data   uint32
    driver [2]uint32
    pull   [2]uint32
}

func setOutput(gpio *gpio_t, pin int) {
    // Get the register number and register bit
    reg := GPIO_A_CONFIG[pin][0]
    bit := GPIO_A_CONFIG[pin][1]
    // Clear the original configuration
    gpio.config[reg] &= ^(0x0F << bit)
    // Set to output mode
    gpio.config[reg] |= OUTPUT << bit
}

func setInput(gpio *gpio_t, pin int) {
    // Get the register number and register bit
    reg := GPIO_A_CONFIG[pin][0]
    bit := GPIO_A_CONFIG[pin][1]
    // Clear the original configuration
    gpio.config[reg] &= ^(0x0F << bit)
    // Set to input mode
    gpio.config[reg] |= INPUT << bit
}

func setPull(gpio *gpio_t, pin, pull int) {
    // Get the register number
    reg := pin / 16
    // Get the register bit
    bit := (pin % 16) * 2
    // Clear the original configuration
    gpio.pull[reg] &= ^(0x03 << bit)
    // Set pull-up/down
    gpio.pull[reg] |= uint32(pull) << bit
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
    // Get the register number and register bit
    reg := GPIO_A_CONFIG[pin][0]
    bit := GPIO_A_CONFIG[pin][1]
    // Clear the original configuration
    gpio.config[reg] &= ^(0x0F << bit)
    return int((gpio.data >> pin) & 0x01)
}

func main() {
    // Open /dev/mem device file in read-write mode
    mem, err := os.OpenFile("/dev/mem", os.O_RDWR|os.O_SYNC, 0)
    if err != nil {
        fmt.Printf("Failed to open /dev/mem: %v\n", err)
        return
    }
    defer mem.Close()

    // Map the registers to memory
    reg, err := syscall.Mmap(int(mem.Fd()), ALLWINNER_H3_BASE, MMAP_SIZE, syscall.PROT_READ|syscall.PROT_WRITE, syscall.MAP_SHARED)
    if err != nil {
        fmt.Printf("Failed to mmap: %v\n", err)
        return
    }
    defer syscall.Munmap(reg)

    // Apply the mapped address offset to the GPIO_A register type
    gpio := (*gpio_t)(unsafe.Pointer(&reg[GPIO_PA_OFFSET]))

    // Set GPIO_A21 as output mode
    setOutput(gpio, 21)
    // Set GPIO_A8 as input mode
    setInput(gpio, 8)
    // Enable pull-up for GPIO_A8
    setPull(gpio, 8, PULL_UP)

    // Blink the LED and read the level
    for {
        // Blink the GPIO_A21 LED
        setLevel(gpio, 21, HIGH)
        time.Sleep(time.Millisecond * 500)
        setLevel(gpio, 21, LOW)
        time.Sleep(time.Millisecond * 500)
        // Read and print the level of GPIO_A8
        level := getLevel(gpio, 8)
        fmt.Printf("GPIO_A8 level: %d\n", level)
    }
}
```

### The Python Implementation

The Python implementation is similar to the Go implementation, using the `mmap` library to perform memory mapping and unmapping.

```python
from mmap import mmap, MAP_SHARED, PROT_READ, PROT_WRITE
from os import open, close, O_RDWR, O_SYNC
from ctypes import Structure, c_uint32
from typing import Type
from time import sleep
from sys import exit

# GPIO_A configuration register list
# { register number, register bit }
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

# Base address of the registers
ALLWINNER_H3_BASE = 0x01C20000
# Offset of GPIO_A relative to ALLWINNER_H3_BASE
GPIO_PA_OFFSET = 0x0800
# Size of the region to be mapped when using the mmap function
MMAP_SIZE = 0x1000
# GPIO mode configuration
INPUT = 0
OUTPUT = 1
# GPIO level configuration
LOW = 0
HIGH = 1
# Pull-up/down configuration
PULL_OFF = 0
PULL_UP = 1
PULL_DOWN = 2


# GPIO port register type
class gpio_t(Structure):
    _fields_ = [
        ("config", c_uint32 * 4),
        ("data", c_uint32),
        ("driver", c_uint32 * 2),
        ("pull", c_uint32 * 2),
    ]


# Configure the specified GPIO_A pin as output mode
def set_output(gpio: Type[gpio_t], pin: int) -> None:
    # Get the register number and register bit
    reg, bit = GPIO_A_CONFIG[pin]
    # Clear the original configuration
    gpio.config[reg] &= ~(0x0F << bit)
    # Set as output mode
    gpio.config[reg] |= (OUTPUT << bit)


# Configure the specified GPIO_A pin as input mode
def set_input(gpio: Type[gpio_t], pin: int) -> None:
    # Get the register number and register bit
    reg, bit = GPIO_A_CONFIG[pin]
    # Clear the original configuration
    gpio.config[reg] &= ~(0x0F << bit)
    # Set as input mode
    gpio.config[reg] |= (INPUT << bit)


# Configure pull-up/down for the specified GPIO_A pin
def set_pull(gpio: Type[gpio_t], pin: int, pull: int) -> None:
    # Get the register number
    reg = int(pin / 16)
    # Get the register bit
    bit = int((pin % 16) * 2)
    # Clear the original configuration
    gpio.pull[reg] &= ~(0x03 << bit)
    # Set pull-up/down
    gpio.pull[reg] |= (pull << bit)


# Set the level of the specified GPIO_A pin
def set_level(gpio: Type[gpio_t], pin: int, level: int) -> None:
    if level == HIGH:
        gpio.data |= (1 << pin)
    elif level == LOW:
        gpio.data &= ~(1 << pin)


# Read the level of the specified GPIO_A pin
def get_level(gpio: Type[gpio_t], pin: int) -> int:
    # Get the register number and register bit
    reg, bit = GPIO_A_CONFIG[pin]
    # Clear the original configuration
    gpio.config[reg] &= ~(0x0F << bit)
    return (gpio.data >> pin) & 0x01


def main():
    # Open the /dev/mem device file in read-write mode
    mem = open("/dev/mem", O_RDWR | O_SYNC)
    if mem < 0:
        print("Failed to open /dev/mem")
        exit(1)

    # Map the registers to memory
    reg = mmap(
        mem, MMAP_SIZE, MAP_SHARED,
        PROT_READ | PROT_WRITE,
        offset=ALLWINNER_H3_BASE
    )

    # Apply the mapped address offset to the GPIO_A register type
    gpio = gpio_t.from_buffer(reg, GPIO_PA_OFFSET)

    # Set GPIO_A21 as output mode
    set_output(gpio, 21)
    # Set GPIO_A8 as input mode
    set_input(gpio, 8)
    # Enable pull-up for GPIO_A8
    set_pull(gpio, 8, PULL_UP)

    # Blink the LED and read the level
    while True:
        # Blink the GPIO_A21 LED
        set_level(gpio, 21, HIGH)
        sleep(0.5)
        set_level(gpio, 21, LOW)
        sleep(0.5)
        # Read and print the level of GPIO_A8
        level = get_level(gpio, 8)
        print("GPIO_A8 level:", level)

    # Unmap the memory
    reg.close()
    close(mem)


if __name__ == "__main__":
    main()
```

## The Conclusion

Last but not least, we have successfully implemented the memory mapping in the Allwinner H3 platform. It works like magic now!

![GPIO_A21 Blinking LED](https://assets.n0w0n.com/allwinner_h3_memory_mapping/2.gif)
![Read GPIO_A8 Level](https://assets.n0w0n.com/allwinner_h3_memory_mapping/3.png)
