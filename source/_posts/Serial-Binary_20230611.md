---
title: 论如何优雅地用串口传数据
date: 2023-06-11 18:56:42
categories: "硬件"
tags:
  - 硬件
  - 嵌入式
  - 单片机
  - C / C++
  - Golang
  - Python
  - 串口
---

又到了一年毕业季，让毕业生们头大的事也莫过于毕业设计了。博主所在的实验室也有一位即将毕业的大四学长，他的毕业设计方向与高速数据采集有关，简单来说，他需要将从 STM32 上采集来的数据透过串口实时发送至上位机，并在上位机上用 Python 做解析，并将数据打上时标，存入 MySQL 数据库。

但是某日这位学长却找到博主，提到自己在解析串口传来的数据时遇到了延时过大的问题和丢包的问题，希望博主能够帮帮忙，而博主在看完这位学长的上下位机代码过后，陷入了沉思，因为这位学长传输并处理数据的方式是这样的。

 1. STM32 读取传感器浮点数据，放到一个长度为 1000 的数组
 2. 将数组中的数据遍历转为字符串，然后拼接为如下形式
  ```
  <data_1>,<data_2>,<data_3>,<data_4>,...\t
  ```
 3. 将该字符串从 STM32 的串口送出
 4. 上位机使用 Python 以 `\t` 为起始和结束标志
 5. 将接收到的文本字符串使用 split 方法分割，取得一个数组
 6. 遍历该数组将数据类型转型回 `float`

乍看上去，这种方法好像没有任何问题，因为在许多带有串口协议的模块上（例如 NMEA 协议的 GNSS 模块），数据都是以这样的形式传输的，**然而这位学长却忽略了一个重要的问题，那就是作为一个高速数据采集的项目，他程序的大部分时间却耗在了字符串处理上**。

博主最后给这位学长的解决方案是，将 STM32 中的传感器数据数组与一个校验和放进结构体，以组帧的方式，将结构体转为字节流，走二进制形式直接从串口送出；Python 上位机的部分则使用 `struct` 包中的 `unpack` 方法来解析下位机传来的二进制数据，直接得到来自下位机的原始数据，同时也省下了数据类型之间互转所花去的时间。

这篇文章，博主会谈谈如何用这种方式优雅地透过串口稳定地传输数据，并给出示例 Arduino 下位机代码和由 Golang 和 Python 实现的上位机代码。

<!-- more -->

# 为什么要用二进制传输

在多数情况下，串口通信是透过文本形式进行的，因为文本具有易读性和易于解析的特点。然而，要传输文本形式的数据，通常也需要进行字符编码，例如使用 ASCII 码，这会导致数据的冗余，即传输的数据量相比原始数据更大，而这些冗余的数据可能会占用更多的带宽和存储空间，尤其在高速数据传输时，会增加传输的时间和资源消耗。

在上述反面教材中，这位大四学长的方法是将传感器数据先转换为字符串形式，然后透过串口发送给上位机。这种方法需要进行数据类型转换、字符串拼接和分割等操作，这些操作在处理大量数据时会耗费大量的时间和计算资源。尤其是在高速数据采集的情况下，数据量很大，处理字符串的开销将会更加明显。

而使用二进制形式传输数据可以有效地解决这些问题。透过将数据转换为二进制字节流，可以直接将原始数据传输给上位机，无需进行数据类型转换和字符串处理操作。这样可以显著提高数据传输的效率和速度，减少延迟和丢包的问题。另外，使用二进制形式传输数据还可以节省传输带宽。文本形式的数据通常会占用更多的字节，因为每个字符需要用若干字节表示。而二进制形式的数据可以更加紧凑地表示，减少了不必要的数据冗余，提高了数据传输的效率。

总结起来，使用二进制传输数据可以带来以下好处：

1.  提高数据传输的效率和速度
2.  减少延迟和丢包的问题
3.  节省传输带宽

# 两种模式性能比较

博主写了两个 Python 小脚本，模拟处理串口接收到的字符串和二进制数据，并计算两者的造成的耗时，分析其性能。

## 字符串模式

首先是字符串模式，博主使用 `random` 包生成了长度为 1000 的随机浮点数据，将其转换为字符串后，按照文章开头的方式进行处理。

```python
from time import time
from sys import getsizeof
from random import uniform


def measure_time(func):
    def inner(*args: tuple, **kwargs: dict):
        start = time()
        result = func(*args, **kwargs)
        print(
            "执行耗时 %f 微秒" %
            ((time() - start) * 1e6)
        )
        return result
    return inner


def generate_random(length: int) -> str:
    random_floats = [str(uniform(0.1, 10)) for _ in range(length)]
    return ",".join(random_floats)


def data_size(data: str) -> int:
    return getsizeof(data)


@measure_time
def mock_serial(data: str) -> list[float]:
    # 以 , 为分隔符，分割字符串
    data = data.split(",")
    # 遍历字符串列表，转回浮点数
    return [float(i) for i in data]


def main() -> None:
    # 模拟出学长从串口收到的数据
    data = generate_random(1000)
    # 取得文本数据的大小
    print(
        "文本大小 %d 字节" %
        data_size(data=data)
    )
    # 处理数据，计算耗时
    mock_serial(data=data)


if __name__ == '__main__':
    main()
```

执行脚本过后，得到了字符串数据占用的大小和文本处理部分的代码耗时。

```
文本大小 18316 字节
执行耗时 348.567963 微秒
```

可以看到，光是由于处理文本造成的耗时，就已经用去了 363 us，生成的字符串也用去了 18 kB 左右。 

## 二进制模式

接下来是二进制模式，博主同样使用 `random` 包生成了长度为 1000 的字符串数据，再将其转换为字节类型数据，再使用 `struct` 包做解析。

```python
from struct import pack, unpack, calcsize
from random import uniform
from sys import getsizeof
from time import time


def measure_time(func):
    def inner(*args: tuple, **kwargs: dict):
        start = time()
        result = func(*args, **kwargs)
        print(
            "执行耗时 %f 微秒" %
            ((time() - start) * 1e6)
        )
        return result
    return inner


def generate_random(length: int) -> bytes:
    random_floats = [uniform(0.1, 10) for _ in range(length)]
    data = pack(f"{length}f", *random_floats)
    return data


def data_size(data: bytes) -> int:
    return getsizeof(data)


@measure_time
def mock_serial(data: bytes) -> list[float]:
    # 计算浮点数个数
    num_floats = len(data) // calcsize('f')
    # 格式化字符串
    format_string = f"{num_floats}f"
    # 使用 struct.unpack 解析字节流
    return list(unpack(format_string, data))


def main() -> None:
    # 生成随机浮点数，转为二进制形式
    data = generate_random(1000)
    # 取得二进制数据的大小
    print(
        "二进制数据大小 %d 字节" %
        data_size(data=data)
    )
    # 处理数据，计算耗时
    mock_serial(data=data)


if __name__ == '__main__':
    main()
```

执行脚本过后，得到了二进制数据占用的大小和二进制解包处理部分的代码耗时。

```
二进制数据大小 4033 字节
执行耗时 10.728836 微秒
```

可以看到，相对于字符串模式，二进制模式的处理耗时减少了 30 多倍，传输的数据大小也减少了将近 5 倍，可以说是质的飞跃。

# 二进制发送一个结构体

在实际的开发中，下位机一般会将传感器采集到的数据放到结构体中，并在结构体中附上校验值，然后透过串口发送给上位机。上位机收到数据后，再将其解析成结构体，进行后续的处理。为便于理解代码，博主这里的下位机以 Arduino 为例，演示如何使用二进制形式发送一个结构体。

例如，下文的结构体类型数据中包含了一个长度为 100 的 `float` 类型数组和一个 `uint8_t` 类型的校验值。

```c
typedef struct {
    float data[100];
    uint8_t checksum;
} sensor_t;
```

## 下位机代码

以 Arduino 为例，下位机的代码如下所示，其中，校验和的部分使用简单校验和算法。

```cpp
#include <Arduino.h>

// 数据帧起始字节
#define HEADER 0x8A
// 数据帧长度
#define LENGTH 100
// 两帧间延时
#define DELAY 10

// 传感器数据结构体
typedef struct {
    float data[LENGTH];
    uint8_t checksum;
} sensor_t;

// 计算校验和
uint8_t getChecksum(float* data, size_t length) {
    uint8_t checksum = 0;

    for (size_t i = 0; i < length; i++) {
        uint8_t* bytes = (uint8_t*)&data[i];

        for (size_t j = 0; j < sizeof(float); j++) {
            checksum ^= bytes[j];
        }
    }

    return checksum;
}

void setup() {
    // 打开串口
    Serial.begin(115200);
}

void loop() {
    // 声明传感器数据结构体
    sensor_t sensorData;

    // 填充传感器数据
    for (uint8_t i = 0; i < LENGTH; i++) {
        // 读取传感器数据（这里为随机数）
        sensorData.data[i] = (float)random(1, 10);
    }
    // 计算校验和
    sensorData.checksum = getChecksum(sensorData.data, LENGTH);

    // 发送数据头
    Serial.write(HEADER);
    // 发送结构体数据
    Serial.write((uint8_t*)&sensorData, sizeof(sensorData));

    // 等待发送完成并延时
    Serial.flush();
    delay(DELAY);
}
```

## 上位机代码

### Golang 版本

原谅博主太热爱 Golang 了，什么都想拿 Go 写一遍。这里用到了 `encoding/binary` 包，可以~~方便地~~将二进制数据解析成结构体。

此外，由于 Golang 的 `io.ReadFull` 方法没有超时机制，所以博主重新实现了这个方法，设置了一个超时时间，如果在超时时间内没有读取到数据，就会抛出异常，避免进程被阻塞。

```go
package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"time"
	"unsafe"

	"github.com/tarm/serial"
)

const (
	// 数据帧起始字节
	HEADER = 0x8A
	// 数据帧长度
	LENGTH = 100
	// 串口波特率
	BAUDRATE = 115200
	// 串口设备路径
	DEVICE = "/dev/ttyUSB0"
)

// 传感器数据结构体
type sensor_t struct {
	Data     [LENGTH]float32
	Checksum uint8
}

func getChecksum(data [LENGTH]float32) byte {
	checksum := byte(0)

	for _, value := range data {
		bytes := *(*[4]byte)(unsafe.Pointer(&value))

		for _, b := range bytes {
			checksum ^= b
		}
	}

	return checksum
}

func readSerial(r io.Reader, buf []byte, timeout time.Duration) (n int, err error) {
	min := len(buf)

	if len(buf) < min {
		return 0, io.ErrShortBuffer
	}

	start := time.Now()
	for n < min && err == nil {
		if time.Since(start) > timeout {
			return 0, fmt.Errorf("reader: timeout due to no response")
		}

		nn, err := r.Read(buf[n:])
		if err != nil {
			return 0, err
		}

		n += nn
	}

	if n >= min {
		err = nil
	} else if n > 0 && err == io.EOF {
		err = io.ErrUnexpectedEOF
	}

	return n, err
}

func main() {
	// 打开串口
	port, err := serial.OpenPort(&serial.Config{
		Name: DEVICE,
		Baud: BAUDRATE,
	})
	if err != nil {
		log.Fatalf("无法打开串口：%v", err)
	}
	defer port.Close()

	// 接收数据帧
	for {
		// 等待接收数据帧头
		for {
			header := make([]byte, 1)
			port.Read(header)

			if bytes.Equal(header, []byte{HEADER}) {
				break
			}
		}

		// 读取数据帧
		buffer := make([]byte, unsafe.Sizeof(sensor_t{}))
		n, err := readSerial(port, buffer, 2*time.Second)
		if err != nil {
			log.Fatalf("无法读取数据帧：%v", err)
		}

		// 解析数据帧
		var SensorData sensor_t
		err = binary.Read(
			bytes.NewReader(buffer[:n]),
			binary.LittleEndian,
			&SensorData,
		)
		if err != nil {
			log.Fatalf("无法解析数据帧：%v", err)
		}

		// 校验数据帧
		if SensorData.Checksum != getChecksum(SensorData.Data) {
			log.Println("校验和不正确")
			continue
		}

		// 打印数据帧
		fmt.Println("校验和正确", SensorData.Data)
	}
}
```

运行该程序后，可以看到下位机与上位机之间的数据传输非常稳定，同时，上下位机之间的数据校验和都是正确的。

```
校验和正确 [4 4 6 6 7 8 7 4 6 7 1 2 3 1 6 4 2 9 4 2 4 7 2 3 4 3 5 6 8 8 3 4 8 7 3 9 4 9 7 5 6 3 5 5 7 9 4 1 3 7 7 3 7 1 9 3 5 3 3 9 1 9 7 4 3 5 4 8 9 7 1 6 4 8 5 7 3 3 3 2 8 8 3 3 9 2 2 3 9 5 4 7 6 7 6 8 7 2 7 3]
校验和正确 [7 1 5 6 4 8 5 4 9 7 9 8 2 8 1 3 8 6 4 3 8 5 2 3 4 4 7 1 1 2 8 1 9 8 5 4 8 6 5 7 8 6 8 3 8 7 1 6 5 1 1 6 6 7 9 9 1 3 4 1 2 9 3 3 4 2 2 5 7 4 5 9 6 3 2 4 7 1 6 6 2 2 4 2 2 3 7 1 1 4 4 7 2 5 8 5 7 7 8 6]
校验和正确 [7 3 2 1 5 9 3 4 2 7 1 9 8 3 9 9 4 3 3 7 6 1 5 2 6 2 3 4 2 7 2 2 6 4 9 3 5 6 9 7 7 1 8 9 3 9 2 4 2 4 4 7 3 2 7 3 4 4 8 5 9 9 9 1 1 2 9 6 8 4 1 1 5 9 4 3 8 5 6 3 4 1 5 6 2 9 2 1 1 2 7 2 7 3 4 5 8 7 9 3]
校验和正确 [2 8 8 4 8 9 5 4 7 7 1 3 3 2 6 9 8 9 5 6 3 3 6 3 5 5 1 4 9 8 4 8 5 9 6 6 9 6 3 9 1 4 4 6 3 4 3 8 5 6 6 1 1 1 4 9 9 5 8 4 2 7 6 8 1 2 3 7 4 4 3 4 2 2 1 9 4 1 3 2 6 2 1 3 9 9 1 1 7 6 1 8 5 3 5 2 1 3 7 6]
校验和正确 [1 2 1 4 8 1 5 8 8 2 1 3 3 5 2 6 3 4 8 7 3 5 5 9 3 7 2 6 9 1 9 3 9 6 9 3 4 8 7 8 1 2 5 8 2 6 5 7 1 7 4 7 6 2 3 5 3 7 2 8 6 5 1 3 1 4 2 1 3 6 2 6 4 7 1 5 7 5 3 7 8 4 3 9 1 6 1 6 6 9 2 9 9 9 4 4 8 6 6 5]
```

### Python 版本

论便利性，Python 只需要短短几行就能解决。串口部分用到了 `pyserial` 包（可能需要使用 pip 手动安装），二进制拆包部分用到了 `struct` 包。

```python
import struct
import serial

# 数据帧起始字节
HEADER = 0x8A
# 数据帧长度
LENGTH = 100
# 串口波特率
BAUDRATE = 115200
# 串口设备路径
DEVICE = '/dev/ttyUSB0'


def get_checksum(data: list[float]) -> int:
    checksum = 0

    for value in data:
        bytes = bytearray(struct.pack("f", value))

        for byte in bytes:
            checksum ^= byte

    return checksum


def main():
    # 定义结构体格式
    sensor_format = struct.Struct("<%dfB" % LENGTH)
    # 打开串口
    ser = serial.Serial(DEVICE, BAUDRATE)

    while True:
        # 等待接收数据帧头
        header = ser.read()

        if header == bytes([HEADER]):
            # 接收结构体数据
            recv = ser.read(sensor_format.size)
            # 解析结构体数据
            data = sensor_format.unpack(recv)

            # 提取数据
            sensor = data[:-1]
            # 提取校验和
            checksum = data[-1]

            # 比较校验和
            if checksum == get_checksum(sensor):
                print("校验和正确", sensor)
            else:
                print("校验和不正确")


if __name__ == '__main__':
    main()
```

运行该程序后，可以看到下位机与上位机之间的数据传输也非常稳定，同时，上下位机之间的数据校验和也是正确的。

```
校验和正确 (9.0, 5.0, 5.0, 8.0, 3.0, 3.0, 7.0, 5.0, 4.0, 3.0, 7.0, 8.0, 7.0, 1.0, 8.0, 7.0, 7.0, 9.0, 1.0, 6.0, 7.0, 5.0, 4.0, 5.0, 4.0, 8.0, 5.0, 9.0, 6.0, 7.0, 1.0, 7.0, 6.0, 1.0, 6.0, 1.0, 6.0, 2.0, 7.0, 3.0, 4.0, 7.0, 3.0, 3.0, 2.0, 9.0, 9.0, 3.0, 4.0, 1.0, 9.0, 2.0, 1.0, 1.0, 6.0, 4.0, 8.0, 8.0, 5.0, 3.0, 7.0, 3.0, 1.0, 6.0, 1.0, 9.0, 3.0, 8.0, 9.0, 5.0, 3.0, 8.0, 3.0, 8.0, 7.0, 7.0, 6.0, 8.0, 8.0, 1.0, 6.0, 3.0, 1.0, 9.0, 3.0, 1.0, 5.0, 5.0, 2.0, 9.0, 9.0, 5.0, 2.0, 3.0, 9.0, 1.0, 7.0, 1.0, 3.0, 7.0)
校验和正确 (4.0, 2.0, 9.0, 5.0, 6.0, 3.0, 3.0, 7.0, 4.0, 1.0, 1.0, 3.0, 5.0, 2.0, 5.0, 2.0, 1.0, 4.0, 7.0, 1.0, 1.0, 1.0, 3.0, 3.0, 1.0, 3.0, 6.0, 8.0, 7.0, 4.0, 6.0, 3.0, 4.0, 3.0, 7.0, 7.0, 9.0, 1.0, 9.0, 9.0, 7.0, 4.0, 3.0, 8.0, 5.0, 4.0, 3.0, 8.0, 3.0, 8.0, 7.0, 9.0, 2.0, 6.0, 9.0, 2.0, 6.0, 9.0, 9.0, 3.0, 8.0, 2.0, 9.0, 1.0, 9.0, 2.0, 5.0, 6.0, 9.0, 9.0, 3.0, 1.0, 6.0, 1.0, 1.0, 9.0, 9.0, 7.0, 8.0, 7.0, 4.0, 6.0, 6.0, 8.0, 4.0, 9.0, 2.0, 5.0, 7.0, 6.0, 6.0, 2.0, 7.0, 1.0, 7.0, 5.0, 2.0, 7.0, 3.0, 6.0)
校验和正确 (7.0, 6.0, 6.0, 7.0, 6.0, 4.0, 2.0, 5.0, 8.0, 7.0, 1.0, 1.0, 1.0, 8.0, 9.0, 1.0, 4.0, 1.0, 8.0, 1.0, 5.0, 5.0, 2.0, 9.0, 4.0, 2.0, 1.0, 7.0, 3.0, 1.0, 3.0, 8.0, 7.0, 5.0, 5.0, 8.0, 3.0, 3.0, 9.0, 4.0, 5.0, 3.0, 9.0, 4.0, 7.0, 6.0, 9.0, 7.0, 7.0, 3.0, 8.0, 1.0, 1.0, 7.0, 9.0, 2.0, 3.0, 6.0, 3.0, 9.0, 1.0, 2.0, 5.0, 7.0, 8.0, 7.0, 5.0, 9.0, 9.0, 9.0, 9.0, 7.0, 1.0, 5.0, 1.0, 3.0, 4.0, 1.0, 1.0, 9.0, 4.0, 5.0, 1.0, 9.0, 8.0, 6.0, 2.0, 8.0, 6.0, 5.0, 2.0, 4.0, 3.0, 1.0, 8.0, 6.0, 9.0, 1.0, 3.0, 1.0)
校验和正确 (1.0, 6.0, 3.0, 8.0, 5.0, 1.0, 3.0, 8.0, 1.0, 5.0, 1.0, 5.0, 1.0, 3.0, 6.0, 5.0, 8.0, 1.0, 2.0, 1.0, 5.0, 1.0, 6.0, 3.0, 5.0, 1.0, 6.0, 5.0, 9.0, 2.0, 2.0, 2.0, 6.0, 4.0, 8.0, 5.0, 1.0, 4.0, 3.0, 2.0, 6.0, 6.0, 5.0, 1.0, 4.0, 8.0, 4.0, 1.0, 6.0, 4.0, 4.0, 4.0, 8.0, 8.0, 8.0, 7.0, 3.0, 1.0, 2.0, 8.0, 9.0, 8.0, 4.0, 3.0, 3.0, 1.0, 2.0, 7.0, 2.0, 4.0, 3.0, 3.0, 1.0, 2.0, 8.0, 4.0, 1.0, 8.0, 6.0, 2.0, 1.0, 7.0, 2.0, 4.0, 5.0, 2.0, 9.0, 5.0, 4.0, 4.0, 8.0, 2.0, 7.0, 5.0, 4.0, 8.0, 6.0, 8.0, 1.0, 2.0)
校验和正确 (7.0, 2.0, 6.0, 7.0, 9.0, 7.0, 6.0, 1.0, 2.0, 3.0, 8.0, 9.0, 1.0, 9.0, 7.0, 5.0, 8.0, 6.0, 5.0, 4.0, 6.0, 1.0, 7.0, 4.0, 7.0, 7.0, 4.0, 9.0, 7.0, 2.0, 5.0, 7.0, 4.0, 5.0, 9.0, 1.0, 5.0, 4.0, 1.0, 3.0, 1.0, 5.0, 5.0, 6.0, 7.0, 1.0, 5.0, 7.0, 2.0, 8.0, 8.0, 8.0, 4.0, 5.0, 6.0, 4.0, 3.0, 2.0, 4.0, 4.0, 3.0, 2.0, 1.0, 9.0, 9.0, 6.0, 9.0, 4.0, 1.0, 5.0, 7.0, 3.0, 3.0, 7.0, 2.0, 1.0, 4.0, 8.0, 9.0, 3.0, 6.0, 8.0, 6.0, 9.0, 4.0, 3.0, 7.0, 7.0, 4.0, 7.0, 4.0, 7.0, 2.0, 6.0, 7.0, 5.0, 9.0, 2.0, 7.0, 2.0)
```

# 关于校验和

校验和是一种用于检测数据传输错误的简单方法。它是透过将数据包中的所有字节相加来计算的。如果和的任何一位不是 0，那么数据包就被认为是损坏的，并且应该被丢弃。

在本文中，博主使用了一个简单的校验和算法，方法是将数据包中的所有字节进行异或运算来实现的。具体来说，它使用了两层循环。外层循环透过迭代 data 数组中的每个元素 value，将 value 转换为一个包含 4 个字节的数组 bytes。

接下来，内层循环透过迭代 bytes 数组中的每个字节 b，使用异或运算符 ^= 将 b 与 checksum 进行异或运算。这样，每个字节都会与 checksum 进行异或，从而在 checksum 中累积计算出最终的校验和，最后，函数返回计算得到的校验和 checksum。

这样的方法虽然简单，但是它无法检测出所有可能的错误。例如，如果两个数据包中的字节交换了位置，它们的校验和将是相同的，这就导致了错误的数据包被误认为是正确的。不过，这种情况很少发生，如果发生了，那就去买张彩票吧。
