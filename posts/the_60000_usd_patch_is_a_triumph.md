---
title: "The $60,000 Patch: A Newcomer's One-Week Triumph"
date: "2025-01-21 01:31:22"
---

In mid-October, after three rounds of assessments and interviews, I finally get a work from a company that specializing in open-source IoT and embedded development.

As an application engineer at this company, my responsibilities include building libraries, maintaining product documentation on the wiki, and creating customized demos for various edge computing devices. Just a few days into the role, I learned about a legacy issue with one of the products. Specifically, the RS485 interfaces had a critical flaw that prevented the port from properly switching the data direction.

The R&D team had previously attempted to address this issue at the application layer by developing a utility tool called `rs485_DE` using C. This tool would open the original RS485 port (e.g., `/dev/ttyAMA2`), then create a new virtual serial port, and monitor data on the virtual port. It would then automatically toggle the chip's $\overline{\text{RE}}$ pin based on the data flow direction. However, this approach introduced a new issue: the higher baud rates, the more frequently data loss would occurr. The root cause was the tool's reliance on polling to check the buffers, coupled with the use of the `libgpiod` library to manipulate GPIOs for flow control, which was too slow to meet the performance requirements.

Adding to the complexity, the RS485 transceiver chip used in the product was the TPT7487. On this chip, the $\overline{\text{RE}}$ pin is responsible for controlling the chip's mode - either receive or transmit. However, instead of being connected to dedicated DTR pins, the $\overline{\text{RE}}$ pin was wired to several general-purpose GPIO pins on the Compute Module 4 (CM4). Unfortunately, the kernel driver did not configure these GPIOs as DTR pins, further limiting the ability to implement a hardware-based solution for automatic data direction control.

![The general-purpose GPIO pins to RS485 transceiver chips](https://assets.n0w0n.com/the_60000_usd_patch_is_a_triumph/1.png)
![The RS485 transceiver schematic](https://assets.n0w0n.com/the_60000_usd_patch_is_a_triumph/2.png)

After thorough discussions and evaluations, the team concluded that replacing all affected products was the only viable solution. Despite the significant cost - an estimated $60,000 - the company prioritized customer satisfaction and product reliability. With no better technical solution available, the recall decision was made to uphold the company's reputation and ensure long-term trust from customers.

Out of curiosity, I requested the schematic of the product and, after some analysis, I surprisingly discovered what I believed could be a potential software solution to the issues. That marked the beginning of a new chapter in addressing the problem.

<!--more-->

## A Kernel-Level Approach to the Issue

From the above schematic and the [TPT7487 datasheet](http://file.3peakic.com.cn:8080/product/Datasheet_TPT7487-TPT7488.pdf), it became clear that when the CM4_RS485_n_DTR (where n = [1, 2, 3]) pins are low, the transceiver enters receive mode; when they are high, the chip switches to transmit mode.

Since this product is based on the CM4, it is highly likely that most users would download and install the official Raspberry Pi OS image, which meant that modifying and redistributing the Raspberry Pi Linux kernel driver would be impractical. This approach would introduce significant inconvenience for users - especially since we don't even have an independent apt source!

Now the problem was clear: a solution that required kernel changes or custom distribution wouldn't work in this environment.

As I continued to think about the issue, I realized that I could write an out-of-tree kernel module to control the $\overline{\text{RE}}$ pin and thus achieve automatic toggling of the transceiver mode. However, the challenge was to implement this solution without relying on polling, which had been a major flaw in the original approach. At the time, I didn't have much experience with kernel modules, but I decided to take a chance and try to solve it.

I recalled an idea I had seen previously in server monitoring tools, where file changes could be tracked by hooking into the syscall layer. Inspired by this concept, I figured I could apply the same principle to monitor the UART calls and control the $\overline{\text{RE}}$ pin's state. Instead of polling, I thought I could hook into the relevant functions that handle data transmission and reception, allowing me to change the pin's state dynamically in response to the data flow direction.

By leveraging this approach, I aimed to develop a solution that was both efficient and non-intrusive, providing a clean software-level fix without needing to modify the underlying kernel or disrupt the user experience.

## The Challenges with Kernel Modifications

As I began exploring potential solutions to hook syscalls, I encountered a significant challenge with the existing syscall hook implementations. Many of the examples I found were designed for kernel versions prior to 5.7. This limitation stemmed from the fact that, starting from kernel 5.7, the `kallsyms_lookup_name` function was no longer exported, which meant the approach of directly searching for kernel symbols by name wouldn't work.

After researching alternatives, I discovered that the kprobe mechanism could be used to achieve the same goal. The kprobe is a powerful tool in the Linux kernel that allows for dynamic instrumentation of functions at runtime. By using kprobe, I could locate and interact with kernel symbols (such as syscalls) even on newer kernels where `kallsyms_lookup_name` is not available. This discovery provided a way to work around the limitations of newer kernel versions.

With this in mind, I proceeded to write a kernel module to implement syscall hooking using kprobe. The following code demonstrates how to hook the `mkdir` syscall, replacing it with a custom version. The module dynamically locates kernel symbols using kprobe, bypassing the restriction imposed by kernel 5.7 and above.

BTW, The following code is designed to work with ARM64 architecture. For x86_64 architecture, [the full demo has been provided on GitHub](https://github.com/bclswl0827/linux-syscall-hook-mkdir/tree/master).

```cpp
#include <asm/unistd.h>
#include <linux/kallsyms.h>
#include <linux/kernel.h>
#include <linux/kprobes.h>
#include <linux/module.h>
#include <linux/version.h>
#include <linux/vmalloc.h>

#define MODULE_NAME "syscall_hook"
#define LOG_PREFIX MODULE_NAME ": "

MODULE_DESCRIPTION("A simple module that hooks the `mkdir` function, works on kernel 5.7 and higher.");
MODULE_AUTHOR("Joshua Lee <chengxun.li@seeed.cc>");
MODULE_LICENSE("Dual MIT/GPL");
MODULE_VERSION("0.0.1");

// For Linux 5.7 and higher versions, `kallsyms_lookup_name` is not exported anymore.
// But we can use `kprobe` to find the address of `kallsyms_lookup_name`.
// The `custom_kallsyms_lookup_name` represents the address of `kallsyms_lookup_name` internally.
// For kernel 5.7 and below, the `custom_kallsyms_lookup_name` simply calls to `kallsyms_lookup_name`.
#if LINUX_VERSION_CODE >= KERNEL_VERSION(5, 7, 0)
typedef unsigned long (*kallsyms_lookup_name_t)(const char* name);
static kallsyms_lookup_name_t custom_kallsyms_lookup_name;
#else
#define custom_kallsyms_lookup_name kallsyms_lookup_name
#endif

// `fixup_kallsyms_lookup_name` extracts the address of `kallsyms_lookup_name` from `kprobe`.
// It returns 0 on success, -EFAULT on failure.
static int fixup_kallsyms_lookup_name(void) {
#if LINUX_VERSION_CODE >= KERNEL_VERSION(5, 7, 0)
    struct kprobe kp = {.symbol_name = "kallsyms_lookup_name"};
    int result = register_kprobe(&kp);
    if (result < 0) {
        printk(KERN_ERR LOG_PREFIX "Failed to register kprobe, returned code: %d\n", result);
        return result;
    }
    custom_kallsyms_lookup_name = (kallsyms_lookup_name_t)kp.addr;
    unregister_kprobe(&kp);
    if (!custom_kallsyms_lookup_name) {
        printk(KERN_ERR LOG_PREFIX "Failed to get address for `kallsyms_lookup_name`\n");
        return -EFAULT;
    }
    printk(KERN_DEBUG LOG_PREFIX "Got address for `kallsyms_lookup_name`: %p\n", custom_kallsyms_lookup_name);
    return 0;
#else
    return 0;
#endif
}

struct vm_struct* (*custom_find_vm_area)(const void* base_addr);      // `custom_find_vm_area` points to the address of `find_vm_area` function.
int (*custom_set_memory_rw)(unsigned long base_addr, int num_pages);  // `custom_set_memory_rw` points to the address of `set_memory_rw` function.
int (*custom_set_memory_ro)(unsigned long base_addr, int num_pages);  // `custom_set_memory_ro` points to the address of `set_memory_ro` function.
static unsigned long syscall_target_base_addr;                        // `syscall_target_base_addr` is the base address of target syscall.

typedef long (*syscall_fn_t)(const struct pt_regs* regs);  // `syscall_fn_t` is the type of any syscall.
static syscall_fn_t prototype_mkdir;                       // `prototype_mkdir` is backup of original `mkdir` function.
static unsigned long* syscall_table;                       // `syscall_table` points to the address of `sys_call_table`.

// `custom_mkdir` is our custom `mkdir` function.
// Do whatever you want here and return the result.
static int custom_mkdir(const struct pt_regs* regs) {
    char filename[512] = {0};
    char __user* pathname = (char*)regs->regs[1];
    if (copy_from_user(filename, pathname, sizeof(filename)) != 0) {
        printk(KERN_ERR LOG_PREFIX "Failed to get file name from user\n");
        return -1;
    }
    printk(KERN_INFO LOG_PREFIX "`mkdir` function called by user, file name: %s\n", filename);
    return prototype_mkdir(regs);  // Call original `mkdir`.
}

static int module_init_fn(void) {
    if (fixup_kallsyms_lookup_name() < 0) {
        return -1;
    }

    custom_set_memory_ro = (void*)custom_kallsyms_lookup_name("set_memory_ro");
    if (custom_set_memory_ro == NULL) {
        printk(KERN_ERR LOG_PREFIX "Could not find `set_memory_ro`\n");
        return -1;
    }

    custom_set_memory_rw = (void*)custom_kallsyms_lookup_name("set_memory_rw");
    if (custom_set_memory_rw == NULL) {
        printk(KERN_ERR LOG_PREFIX "Could not find `set_memory_rw`\n");
        return -1;
    }

    custom_find_vm_area = (void*)custom_kallsyms_lookup_name("find_vm_area");
    if (custom_find_vm_area == NULL) {
        printk(KERN_ERR LOG_PREFIX "Could not find `find_vm_area`\n");
        return -1;
    }

    syscall_table = (unsigned long*)custom_kallsyms_lookup_name("sys_call_table");
    if (syscall_table == NULL) {
        printk(KERN_ERR LOG_PREFIX "Could not find `sys_call_table`\n");
        return -1;
    }
    prototype_mkdir = (syscall_fn_t)syscall_table[__NR_mkdirat];  // Create backup of original `mkdir` function.

    syscall_target_base_addr = ((unsigned long)(syscall_table + __NR_mkdirat)) & PAGE_MASK;
    struct vm_struct* area = custom_find_vm_area((void*)syscall_target_base_addr);
    if (area == NULL) {
        printk(KERN_ERR LOG_PREFIX "Could not find vm area\n");
        return -1;
    }
    area->flags |= VM_ALLOC;

    int result = custom_set_memory_rw(syscall_target_base_addr, 1);
    if (result != 0) {
        printk(KERN_ERR LOG_PREFIX "Failed to set memory to read/write mode\n");
        return -1;
    }
    syscall_table[__NR_mkdirat] = (unsigned long)custom_mkdir;  // Replace original `mkdir` with our custom one.
    result = custom_set_memory_ro(syscall_target_base_addr, 1);
    if (result != 0) {
        printk(KERN_ERR LOG_PREFIX "Failed to set memory to read-only mode\n");
        return -1;
    }

    printk(KERN_INFO LOG_PREFIX "Hooked `mkdir` function successfully (%p => %p)\n", prototype_mkdir, custom_mkdir);
    return 0;
}

static void module_end_fn(void) {
    int result = custom_set_memory_rw(syscall_target_base_addr, 1);
    if (result != 0) {
        printk(KERN_ERR LOG_PREFIX "Failed to set memory to read/write mode\n");
        return;
    }
    syscall_table[__NR_mkdirat] = (unsigned long)prototype_mkdir;  // Restore original `mkdir` function.
    result = custom_set_memory_ro(syscall_target_base_addr, 1);
    if (result != 0) {
        printk(KERN_ERR LOG_PREFIX "Failed to set memory to read-only mode\n");
        return;
    }

    printk(KERN_INFO LOG_PREFIX "Unhooked `mkdir` function successfully (%p => %p)\n", custom_mkdir, prototype_mkdir);
}

module_init(module_init_fn);
module_exit(module_end_fn);
```

![Hook loaded](https://assets.n0w0n.com/the_60000_usd_patch_is_a_triumph/3.png)

Cheers!

## Happy Hacking with Kprobes

Over the next few days, I broke down the task into smaller steps and gradually implemented the required functionality:

1. Set GPIO Mode and Control Pin Levels in the Kernel Module
2. Hook `uart_write` in the Kernel Module to Raise GPIO Before Transmission
3. Wait for `uart_write` Completion and Lower GPIO After Transmission

[Thanks to an article I wrote in 2023 on using mmap for GPIO control](https://n0w0n.com/#/post/allwinner_h3_memory_mapping), I successfully implemented GPIO control in a Raspberry Pi kernel module. The final code is as follows, [I also made it public on my GitHub repository](https://github.com/bclswl0827/r1000v1-rs485-autoflow).

```cpp
#include <asm/io.h>
#include <linux/delay.h>
#include <linux/kprobes.h>
#include <linux/slab.h>
#include <linux/tty.h>
#include <linux/workqueue.h>

#ifndef MODULE_NAME
#define MODULE_NAME "r1000v1_rs485_autoflow"
#endif

#ifndef MODULE_VER
#define MODULE_VER "custom"
#endif

MODULE_DESCRIPTION("This module fixes RS-485 flow control issue on reComputer R1000 v1.0 by hooking `uart_write` function.");
MODULE_AUTHOR("Joshua Lee <chengxun.li@seeed.cc>");
MODULE_LICENSE("Dual MIT/GPL");
MODULE_VERSION(MODULE_VER);

#define BCM2711_GPIO_BASE (0xfe000000 + 0x200000)

volatile unsigned int* GPFSEL0;                  // Function selector for GPIO 0-9, for CM4_RS485_1_DTR at GPIO_6.
volatile unsigned int* GPFSEL1;                  // Function selector for GPIO 10-19, for CM4_RS485_2_DTR at GPIO_17.
volatile unsigned int* GPFSEL2;                  // Function selector for GPIO 20-29, for CM4_RS485_3_DTR at GPIO_24.
volatile unsigned int* GPSET0;                   // Register to set GPIO 0-31 to high.
volatile unsigned int* GPCLR0;                   // Register to set GPIO 0-31 to low.
volatile unsigned int* GPIO_PUP_PDN_CNTRL_REG0;  // Register to set pull up/down control of GPIO 0-15.
volatile unsigned int* GPIO_PUP_PDN_CNTRL_REG1;  // Register to set pull up/down control of GPIO 16-31.

static void rs485_dtr_init(void) {
    // Re-map GPIO registers, offsets are given in the datasheet
    GPFSEL0 = (volatile unsigned int*)ioremap(BCM2711_GPIO_BASE + 0x00, 4);
    GPFSEL1 = (volatile unsigned int*)ioremap(BCM2711_GPIO_BASE + 0x04, 4);
    GPFSEL2 = (volatile unsigned int*)ioremap(BCM2711_GPIO_BASE + 0x08, 4);
    GPSET0 = (volatile unsigned int*)ioremap(BCM2711_GPIO_BASE + 0x1c, 4);
    GPCLR0 = (volatile unsigned int*)ioremap(BCM2711_GPIO_BASE + 0x28, 4);
    GPIO_PUP_PDN_CNTRL_REG0 = (volatile unsigned int*)ioremap(BCM2711_GPIO_BASE + 0xe4, 4);
    GPIO_PUP_PDN_CNTRL_REG1 = (volatile unsigned int*)ioremap(BCM2711_GPIO_BASE + 0xe8, 4);

    // Set CM4_RS485_1_DTR at GPIO_6 to output mode (GPFSEL0[20:18]), no internal pull
    *GPFSEL0 &= ~(7 << 18);
    *GPFSEL0 |= (1 << 18);
    *GPIO_PUP_PDN_CNTRL_REG0 &= ~(3 << 12);
    *GPIO_PUP_PDN_CNTRL_REG0 |= (0 << 12);
    // Set CM4_RS485_2_DTR at GPIO_17 to output mode (GPFSEL1[23:21]), no internal pull
    *GPFSEL1 &= ~(7 << 21);
    *GPFSEL1 |= (1 << 21);
    *GPIO_PUP_PDN_CNTRL_REG1 &= ~(3 << 2);
    *GPIO_PUP_PDN_CNTRL_REG1 |= (0 << 2);
    // Set CM4_RS485_3_DTR at GPIO_24 to output mode (GPFSEL2[14:12]), no internal pull
    *GPFSEL2 &= ~(7 << 12);
    *GPFSEL2 |= (1 << 12);
    *GPIO_PUP_PDN_CNTRL_REG1 &= ~(3 << 16);
    *GPIO_PUP_PDN_CNTRL_REG1 |= (0 << 16);
    // Set all DTR pins to low
    *GPCLR0 = (1 << 6) | (1 << 17) | (1 << 24);
}

static void rs485_dtr_deinit(void) {
    // Set all DTR pins to low
    *GPCLR0 = (1 << 6) | (1 << 17) | (1 << 24);
    // Unmap GPIO registers
    iounmap(GPFSEL0);
    iounmap(GPFSEL1);
    iounmap(GPFSEL2);
    iounmap(GPSET0);
    iounmap(GPCLR0);
    iounmap(GPIO_PUP_PDN_CNTRL_REG0);
    iounmap(GPIO_PUP_PDN_CNTRL_REG1);
}

static bool rs485_is_builtin_dev(struct tty_struct* tty) {
    // `ttyAMA` is for built-in RS-485 interface
    return strcmp(tty->driver->name, "ttyAMA") == 0;
}

static void rs485_dtr_set(int dev_num, bool enable) {
    switch (dev_num) {
        case 2:  // ttyAMA2
            if (enable) {
                *GPSET0 = (1 << 6);
            } else {
                *GPCLR0 = (1 << 6);
            }
            break;
        case 3:  // ttyAMA3
            if (enable) {
                *GPSET0 = (1 << 17);
            } else {
                *GPCLR0 = (1 << 17);
            }
            break;
        case 5:  // ttyAMA5
            if (enable) {
                *GPSET0 = (1 << 24);
            } else {
                *GPCLR0 = (1 << 24);
            }
            break;
    }
}

static int rs485_get_dev_num(struct tty_struct* tty) {
    if (tty->index == 2 || tty->index == 3 || tty->index == 5) {
        return tty->index;
    }
    return -EINVAL;
}

struct rs485_worker_t {
    struct delayed_work work;
    struct tty_struct* tty;
};
static struct workqueue_struct* rs485_worker_queues[3];  // 3 queues for 3 RS-485 interfaces (ttyAMA2, ttyAMA3, ttyAMA5)

static int rs485_get_worker_index(int dev_num) {
    if (dev_num == 2) {
        return 0;
    } else if (dev_num == 3) {
        return 1;
    } else if (dev_num == 5) {
        return 2;
    }
    return -EINVAL;
}

static void rs485_worker_oncomplete(struct work_struct* work) {
    struct rs485_worker_t* rs485_worker = container_of(work, struct rs485_worker_t, work.work);
    // Wait until data is sent out, then set DTR to low
    if (rs485_worker->tty->ops->write_room(rs485_worker->tty) == 0) {
        schedule_delayed_work(&rs485_worker->work, usecs_to_jiffies(1));
        return;
    }

    // Wait for some time before setting DTR to low, delay is based on baudrate
    // Each character takes (10 * 1000 / baudrate) milliseconds
    // Plus 60ns for transceiver mode switch (mentionned in TPT7487 datasheet) 
    int baudrate = tty_get_baud_rate(rs485_worker->tty);
    msleep((10 * 1000) / baudrate);
    ndelay(60);
    rs485_dtr_set(rs485_worker->tty->index, false);
    kfree(rs485_worker);
}

static void hook_uart_write_onreturn(struct kprobe* p, struct pt_regs* regs, unsigned long flags) {
    struct tty_struct* tty = (struct tty_struct*)regs->regs[0];
    if (rs485_is_builtin_dev(tty)) {
        int dev_num = rs485_get_dev_num(tty);
        if (dev_num != -EINVAL) {
            struct rs485_worker_t* rs485_worker = kmalloc(sizeof(*rs485_worker), GFP_KERNEL);
            rs485_worker->tty = tty;
            if (rs485_worker) {
                INIT_DELAYED_WORK(&rs485_worker->work, rs485_worker_oncomplete);
                int queue_index = rs485_get_worker_index(dev_num);
                if (queue_index != -EINVAL) {
                    queue_delayed_work(rs485_worker_queues[queue_index], &rs485_worker->work, 0);
                }
            }
        }
    }
}

static int hook_uart_write_onstart(struct kprobe* p, struct pt_regs* regs) {
    struct tty_struct* tty = (struct tty_struct*)regs->regs[0];
    if (rs485_is_builtin_dev(tty)) {
        int dev_num = rs485_get_dev_num(tty);
        rs485_dtr_set(dev_num, true);
    }

    return 0;
}

static unsigned long get_fn_addr(const char* symbol_name) {
    struct kprobe temp_kp = {.symbol_name = symbol_name};
    int ret = register_kprobe(&temp_kp);
    unsigned long fn_addr = (unsigned long)temp_kp.addr;

    unregister_kprobe(&temp_kp);
    if (ret < 0) {
        return ret;
    }
    if (temp_kp.addr == NULL) {
        return -EFAULT;
    }

    return fn_addr;
}

#define LOG_PREFIX MODULE_NAME ": "
struct kprobe hook_uart_write;

static int module_init_fn(void) {
    rs485_dtr_init();

    // Create worker queues for each RS-485 interface
    rs485_worker_queues[0] = create_singlethread_workqueue(MODULE_NAME "_worker_queue_2");
    if (rs485_worker_queues[0] == NULL) {
        printk(KERN_ERR LOG_PREFIX "Failed to create worker queue for ttyAMA2\n");
        return -ENOMEM;
    }
    rs485_worker_queues[1] = create_singlethread_workqueue(MODULE_NAME "_worker_queue_3");
    if (rs485_worker_queues[1] == NULL) {
        printk(KERN_ERR LOG_PREFIX "Failed to create worker queue for ttyAMA3\n");
        return -ENOMEM;
    }
    rs485_worker_queues[2] = create_singlethread_workqueue(MODULE_NAME "_worker_queue_5");
    if (rs485_worker_queues[2] == NULL) {
        printk(KERN_ERR LOG_PREFIX "Failed to create worker queue for ttyAMA5\n");
        return -ENOMEM;
    }

    // Hook `uart_write` function
    unsigned long target_fn_addr = get_fn_addr("uart_write");
    if (target_fn_addr < 0) {
        printk(KERN_ERR LOG_PREFIX "Failed to get address for `uart_write`, returned code: %ld\n", target_fn_addr);
        return target_fn_addr;
    }
    hook_uart_write.addr = (kprobe_opcode_t*)target_fn_addr;
    hook_uart_write.pre_handler = (void*)hook_uart_write_onstart;
    hook_uart_write.post_handler = (void*)hook_uart_write_onreturn;
    int ret = register_kprobe(&hook_uart_write);
    if (ret < 0) {
        printk(KERN_ERR LOG_PREFIX "Failed to register kprobe for `uart_write`, returned code: %d\n", ret);
        return ret;
    }

    printk(KERN_INFO LOG_PREFIX "RS-485 interface has been hooked successfully\n");
    return 0;
}

static void module_exit_fn(void) {
    unregister_kprobe(&hook_uart_write);
    for (int i = 0; i < sizeof(rs485_worker_queues) / sizeof(rs485_worker_queues[0]); i++) {
        if (rs485_worker_queues[i]) {
            destroy_workqueue(rs485_worker_queues[i]);
        }
    }
    rs485_dtr_deinit();

    printk(KERN_INFO LOG_PREFIX "RS-485 interface has been unhooked successfully\n");
}

module_init(module_init_fn);
module_exit(module_exit_fn);
```

## The Result and Thoughts

![The Kernel Module Solution](https://assets.n0w0n.com/the_60000_usd_patch_is_a_triumph/4.gif)

After deploying the module and testing extensively across various baud rates, the issue was successfully resolved. There was no need to replace products or recall shipments, saving the company $60,000 and sparing customers from potential inconvenience. Well, the software-level solution proved efficient, effective, and sustainable.

This experience reaffirmed the importance of thinking creatively when addressing challenges. Even as a newcomer, I was able to leverage open-source tools and innovative thinking to tackle a seemingly insurmountable problem. It’s a reminder that in technology, persistence and curiosity often yield unexpected and rewarding outcomes.
