"use strict";(self.webpackChunkn0w0n_blog=self.webpackChunkn0w0n_blog||[]).push([[957],{7957:(e,t,a)=>{a.r(t),a.d(t,{default:()=>o});var n=a(2074),i=a(4414);const o=()=>{const e=[{title:"The $60,000 Patch: A Newcomer's One-Week Triumph",created_at:1737423082e3,updated_at:1737457527680,slug:"the_60000_usd_patch_is_a_triumph",summary:"\nIn mid-October, after three rounds of assessments and interviews, I finally get a work from a company that specializing in open-source IoT and embedded development.\n\nAs an application engineer at this company, my responsibilities include building libraries, maintaining product documentation on the wiki, and creating customized demos for various edge computing devices. Just a few days into the role, I learned about a legacy issue with one of the products. Specifically, the RS485 interfaces had a critical flaw that prevented the port from properly switching the data direction.\n\nThe R&D team had previously attempted to address this issue at the application layer by developing a utility tool called `rs485_DE` using C. This tool would open the original RS485 port (e.g., `/dev/ttyAMA2`), then create a new virtual serial port, and monitor data on the virtual port. It would then automatically toggle the chip's $\\overline{\\text{RE}}$ pin based on the data flow direction. However, this approach introduced a new issue: the higher baud rates, the more frequently data loss would occurr. The root cause was the tool's reliance on polling to check the buffers, coupled with the use of the `libgpiod` library to manipulate GPIOs for flow control, which was too slow to meet the performance requirements.\n\nAdding to the complexity, the RS485 transceiver chip used in the product was the TPT7487. On this chip, the $\\overline{\\text{RE}}$ pin is responsible for controlling the chip's mode - either receive or transmit. However, instead of being connected to dedicated DTR pins, the $\\overline{\\text{RE}}$ pin was wired to several general-purpose GPIO pins on the Compute Module 4 (CM4). Unfortunately, the kernel driver did not configure these GPIOs as DTR pins, further limiting the ability to implement a hardware-based solution for automatic data direction control.\n\n![The general-purpose GPIO pins to RS485 transceiver chips](https://assets.n0w0n.com/the_60000_usd_patch_is_a_triumph/1.png)\n![The RS485 transceiver schematic](https://assets.n0w0n.com/the_60000_usd_patch_is_a_triumph/2.png)\n\nAfter thorough discussions and evaluations, the team concluded that replacing all affected products was the only viable solution. Despite the significant cost - an estimated $60,000 - the company prioritized customer satisfaction and product reliability. With no better technical solution available, the recall decision was made to uphold the company's reputation and ensure long-term trust from customers.\n\nOut of curiosity, I requested the schematic of the product and, after some analysis, I surprisingly discovered what I believed could be a potential software solution to the issues. That marked the beginning of a new chapter in addressing the problem.\n\n",words:23010},{title:"MMAP on Allwinner H3 - The faster way to access to GPIO pins",created_at:168455928e4,updated_at:1737457527680,slug:"allwinner_h3_memory_mapping",summary:"\nWhen it comes to control the GPIO pins on a development board, many of developers have tried to access the GPIO pins from the user space (e.g. The `sysfs`). But this approach may not perform well because it's not that fast as you may thought - at least it was vividly reflected in one of my recent needs.\n\nRecently I took over a maker-level project that uses the Raspberry Pi and in the project, the Pi needs to continuously poll the level of a certain output from the FPGA at high speed to determine whether the data is \"ready\". However, as the price of Raspberry Pi rises, I had to consider the affordable alternative, finally I settled on the Orange Pi One, which uses the Allwinner H3 and has a 512 MB of RAM - That's enough for my needs.\n\nIn the original Raspberry Pi implementation for the project, the state of the GPIO pins was obtained directly by accessing the GPIO registers - the memory mapping (mmap), and we know that different SOCs have different internal register sets and addresses, so to port the project to the Allwinner H3, some significant changes in the code were required.\n\nThis article will introduce how I understand the concept of mmap, and how did I analyse the datasheet provided by Allwinner, in the last, I'll provide a complete example of how to use mmap to access GPIO pins in C, Go, and Python.\n\n![Orange Pi One](https://assets.n0w0n.com/allwinner_h3_memory_mapping/1.jpg)\n\n",words:22794}].reduce(((e,t)=>{const a=new Date(t.created_at).getFullYear();return e[a]||(e[a]=[]),e[a].push(t),e}),{}),t=Object.keys(e).sort(((e,t)=>Number(t)-Number(e)));return(0,i.jsxs)("div",{className:"max-w-3xl mx-auto px-10 space-y-8 animate-fade-right",children:[(0,i.jsx)("h1",{className:"text-3xl font-extrabold text-gray-800 mb-6 text-center",children:"Post Archive"}),t.map((t=>(0,i.jsxs)("div",{className:"mb-8",children:[(0,i.jsx)("h2",{className:"text-2xl text-gray-700 font-semibold mb-4 border-b pb-2 border-gray-300",children:t}),(0,i.jsx)("ul",{className:"space-y-4",children:e[Number(t)].map((e=>(0,i.jsx)("li",{className:"",children:(0,i.jsx)(n.N_,{to:"/post/".concat(e.slug),className:"text-lg text-gray-600 hover:text-amber-600 transition-all",children:e.title})},e.slug)))})]},t)))]})}}}]);