---
title: "No C, No Python, No Problem: Writing a SeisComP Plugin in Pure Go"
date: "2025-09-24 13:08:00 +0800"
---

It has been a few months since I left Seeed Studio and started working on my own business, [AnyShake Project](https://anyshake.org), a open-source project targeted at Raspberry Shake and other similar products.

As part of building a complete seismograph solution — both hardware and software — I knew from the beginning that integration with SeisComP was a must. It's one of the most widely used tools in professional seismology for real-time monitoring, data acquisition, and event detection. However, most SeisComP plugins are traditionally written in either C++ or Python. And to be honest, after years of juggling build systems, header hell, and Python dependency management, I decided: not this time.

## The Challenge

SeisComP's plugin system is designed with C, C++, and Python in mind. There's no official plugin SDK for Go — actually, no SDKs at all — and the documentation is painfully sparse when it comes to writing custom data sources.

To be honest, after getting used to modern developer tools and documentation with quick starts, examples, and real-world use cases, reading the SeisComP docs felt like stepping back in time. Instead of showing you how to get something working quickly, it starts with every possible concept, explained in abstract detail. I get that it's thorough, but when all I wanted was "how do I feed my waveform into the system?"—it was a slog.

I don’t need a philosophical discussion on the nature of a stream; I need a working data pipeline.

So I decided to do it the hard way: dive into the source code, trace how existing modules talk to each other, and build my own minimal setup from scratch.

## Why Go?

Go (or Golang) has become my go-to language for building everything from firmware tools to backend services. It compiles to a single binary, it's cross-platform friendly, and concurrency is baked into the language. Most importantly, it allows me to move fast without sacrificing stability or maintainability. So the question became: can I write a fully functional SeisComP plugin in pure Go—no C bindings, no Python wrappers?

> Spoiler alert: yes, I can.

<!-- more -->

## Analysis and Design

Seismograph manufacturers are scattered across the globe, and most of them use their own proprietary protocols. To accommodate this diversity, SeisComP adopts an interface-oriented design pattern: it provides two files, [`plugin.c`](https://github.com/SeisComP/seedlink/blob/master/libs/plugin/plugin.c) and [`plugin.h`](https://github.com/SeisComP/seedlink/blob/master/libs/plugin/plugin.h), allowing users to implement specific function signatures (such as `send_raw3`) themselves. Once implemented, users can register their plugin within SeisComP, enabling dynamic loading of data sources without modifying the SeisComP core.

This is a particularly clever approach because it elegantly decouples third-party data ingestion from the core system. By examining the source code of `plugin.c`, we can see that the final call chain is as follows:

```
send_raw3
  ↓
  ├─ Prepare and populate header fields (station, channel, time, correction...)
  ↓
  ├─ If no data is available:
  │     ├─ Send a time packet (PluginRawDataTimePacket)
  │     └─ Or send a GAP packet (PluginRawDataGapPacket)
  ↓
  ├─ Loop and send data in fragments:
  │     ├─ head.packtype = TimePacket (first packet) / DataPacket (subsequent packets)
  │     ├─ head.data_size = sample_count
  │     └─ Call send_packet()
  │           ↓
  │           ├─ writen(PLUGIN_FD, head)
  │           └─ writen(PLUGIN_FD, dataptr)
  ↓
  └─ Return the total number of bytes sent
```

Here, `PLUGIN_FD` is defined as `63` — a predefined constant in SeisComP’s SeedLink plugin system. It represents a special file descriptor used as an IPC "pipe" for communication between the plugin and SeisComP.

This insight reveals an important fact: if we can replicate this process, we can implement a fully functional SeisComP plugin in Go.

In the case of AnyShake Observer, the software already provides a TCP-based data forwarder. This means that all I need to do is connect to the server, receive and parse the incoming data, and then format and send it according to SeisComP’s expected protocol.

## Implementation

Initially, I considered calling the C functions directly via cgo, but ultimately, due to cross-compilation concerns, I decided to translate the prototypes into pure Go code—after all, they aren’t particularly complex. I created a struct that encapsulates the file descriptor and exposed the following methods:

-   SendRaw3
-   SendFlush3
-   SendMSeed
-   SendMSeed2
-   SendLog3
-   SendRawDepoch

They maintain the same function signatures as in C, but are implemented entirely in pure Go, requiring no cgo support and thus can be called directly from Go. The final code is as follows:

```go
import (
	"encoding/binary"
	"os"
	"time"
)

const (
	PLUGIN_FD             = 63
	PLUGIN_MSEED_SIZE     = 512
	PLUGIN_MAX_MSG_SIZE   = 448
	PLUGIN_MAX_DATA_BYTES = 4000
)

const (
	PLUGIN_RAW_TIME_PACKET  = 8
	PLUGIN_RAW_PACKET       = 9
	PLUGIN_RAW_GAP_PACKET   = 10
	PLUGIN_RAW_FLUSH_PACKET = 11
	PLUGIN_LOG_PACKET       = 12
	PLUGIN_MSEED_PACKET     = 13
)

type PluginPacketHeader struct {
	PackType       uint32
	Station        [10]byte
	Channel        [10]byte
	Year           uint32
	Yday           uint32
	Hour           uint32
	Minute         uint32
	Second         uint32
	Usec           uint32
	UsecCorrection int32
	TimingQuality  int32
	DataSize       int32
}

type SeedLinkPluginIPC struct {
	fd *os.File
}

func NewSeedlinkPluginIPC() SeedLinkPluginIPC {
	return SeedLinkPluginIPC{
		fd: os.NewFile(PLUGIN_FD, "seedlink"),
	}
}

func (s *SeedLinkPluginIPC) sendPacket(head *PluginPacketHeader, data []byte) error {
	headerBuf := make([]byte, 60)

	binary.LittleEndian.PutUint32(headerBuf[0:4], head.PackType)
	copy(headerBuf[4:14], head.Station[:])
	copy(headerBuf[14:24], head.Channel[:])
	binary.LittleEndian.PutUint32(headerBuf[24:28], head.Year)
	binary.LittleEndian.PutUint32(headerBuf[28:32], head.Yday)
	binary.LittleEndian.PutUint32(headerBuf[32:36], head.Hour)
	binary.LittleEndian.PutUint32(headerBuf[36:40], head.Minute)
	binary.LittleEndian.PutUint32(headerBuf[40:44], head.Second)
	binary.LittleEndian.PutUint32(headerBuf[44:48], head.Usec)
	binary.LittleEndian.PutUint32(headerBuf[48:52], uint32(head.UsecCorrection))
	binary.LittleEndian.PutUint32(headerBuf[52:56], uint32(head.TimingQuality))
	binary.LittleEndian.PutUint32(headerBuf[56:60], uint32(head.DataSize))

	if _, err := s.fd.Write(headerBuf); err != nil {
		return err
	}
	if data != nil {
		if _, err := s.fd.Write(data); err != nil {
			return err
		}
	}

	return nil
}

func (s *SeedLinkPluginIPC) isLeap(y int) bool {
	return (y%400 == 0) || (y%4 == 0 && y%100 != 0)
}

func (s *SeedLinkPluginIPC) ldoy(y, m int) int {
	doy := [...]int{0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365}
	if s.isLeap(y) && m >= 3 {
		return doy[m-1] + 1
	}
	return doy[m-1]
}

func (s *SeedLinkPluginIPC) mdy2dy(month, day, year int) int {
	return s.ldoy(year, month) + day - 1
}

func (s *SeedLinkPluginIPC) Close() {
	_ = s.fd.Close()
}

func (s *SeedLinkPluginIPC) SendRaw3(station, channel string, t time.Time, usecCorr, timingQuality int, data []int32) error {
	const maxSamplesPerPacket = PLUGIN_MAX_DATA_BYTES / 4 // 4000 / 4 = 1000

	sent := 0
	total := len(data)
	first := true

	for sent < total {
		end := sent + maxSamplesPerPacket
		if end > total {
			end = total
		}
		chunk := data[sent:end]

		var head PluginPacketHeader
		copy(head.Station[:], station)
		copy(head.Channel[:], channel)

		if first {
			head.PackType = PLUGIN_RAW_TIME_PACKET
			head.Year = uint32(t.Year())
			head.Yday = uint32(s.mdy2dy(int(t.Month()), t.Day(), t.Year()))
			head.Hour = uint32(t.Hour())
			head.Minute = uint32(t.Minute())
			head.Second = uint32(t.Second())
			head.Usec = uint32(t.Nanosecond() / 1000)
			head.UsecCorrection = int32(usecCorr)
			head.TimingQuality = int32(timingQuality)
			first = false
		} else {
			head.PackType = PLUGIN_RAW_PACKET
		}

		head.DataSize = int32(len(chunk))

		dataBytes := make([]byte, len(chunk)*4)
		for i, v := range chunk {
			binary.LittleEndian.PutUint32(dataBytes[i*4:(i+1)*4], uint32(v))
		}

		if err := s.sendPacket(&head, dataBytes); err != nil {
			return err
		}

		sent = end
	}

	return nil
}

func (s *SeedLinkPluginIPC) SendFlush3(station, channel string) error {
	var head PluginPacketHeader
	copy(head.Station[:], station)
	copy(head.Channel[:], channel)
	head.PackType = PLUGIN_RAW_FLUSH_PACKET
	head.DataSize = 0

	return s.sendPacket(&head, nil)
}

func (s *SeedLinkPluginIPC) SendMSeed(station string, data []byte) error {
	if len(data) != PLUGIN_MSEED_SIZE {
		return nil
	}

	var head PluginPacketHeader
	copy(head.Station[:], station)
	head.PackType = PLUGIN_MSEED_PACKET
	head.DataSize = int32(len(data))

	return s.sendPacket(&head, data)
}

func (s *SeedLinkPluginIPC) SendMSeed2(station, channel string, seq int, data []byte) error {
	if len(data) != PLUGIN_MSEED_SIZE {
		return nil
	}

	var head PluginPacketHeader
	copy(head.Station[:], station)
	copy(head.Channel[:], channel)
	head.PackType = PLUGIN_MSEED_PACKET
	head.TimingQuality = int32(seq)
	head.DataSize = int32(len(data))

	return s.sendPacket(&head, data)
}

func (s *SeedLinkPluginIPC) SendLog3(station string, t time.Time, msg string) error {
	var head PluginPacketHeader
	copy(head.Station[:], station)
	head.PackType = PLUGIN_LOG_PACKET

	head.Year = uint32(t.Year())
	head.Yday = uint32(s.mdy2dy(int(t.Month()), t.Day(), t.Year()))
	head.Hour = uint32(t.Hour())
	head.Minute = uint32(t.Minute())
	head.Second = uint32(t.Second())
	head.Usec = uint32(t.Nanosecond() / 1000)

	data := []byte(msg)
	head.DataSize = int32(len(data))

	return s.sendPacket(&head, data)
}

func (s *SeedLinkPluginIPC) SendRawDepoch(station, channel string, depoch float64, usecCorr, timingQuality int, data []int32) error {
	sec := int64(depoch)
	usec := int((depoch - float64(sec)) * 1e6)
	t := time.Unix(sec, int64(usec)*1000).UTC()
	return s.SendRaw3(station, channel, t, usecCorr, timingQuality, data)
}
```

In the AnyShake Project, the AnyShake Explorer — used as a data acquisition device—can experience gradual clock drift due to tiny deviations in its crystal oscillator. To address this, I chose to use `SendMSeed` to provide the data, ensuring that each data packet carries a fully controllable timestamp.

The function `SendMSeed` only accepts pre-encoded MiniSEED packets, so I leveraged a pure Go MiniSEED encoding library I previously developed for the AnyShake Project, [mseedio](https://github.com/bclswl0827/mseedio), to handle this task.

It’s important to note that, according to the implementation in `plugin.c`, each MiniSEED packet written to `SendMSeed` must have a length equal to `PLUGIN_MSEED_SIZE`, i.e., 512 bytes. Through extensive testing, I found that MiniSEED packets containing 100 samples are safe. Therefore, I set 100 samples as the upper limit for a single MiniSEED data block. Before encoding, I check the data length and slice it appropriately. I also encapsulated the MiniSEED encoding logic to make it easier to use.

```go
import (
	"fmt"
	"time"

	"github.com/bclswl0827/mseedio"
)

const MINISEED_CHUNK_SAMPLES = 100

type MiniSeedData struct {
	Station    string
	Network    string
	Location   string
	Channel    string
	Timestamp  int64
	SampleRate int
	Data       []int32
}

func NewMiniSeedData(timestamp time.Time, station, network, location, channel string, sampleRate int, data []int32) MiniSeedData {
	return MiniSeedData{
		Timestamp:  timestamp.UnixMilli(),
		Station:    station,
		Network:    network,
		Location:   location,
		Channel:    channel,
		SampleRate: sampleRate,
		Data:       data,
	}
}

func (m *MiniSeedData) chunkInt32Slice(data []int32, chunkSamples int) [][]int32 {
	var chunks [][]int32

	for i := 0; i < len(data); i += chunkSamples {
		end := min(i+chunkSamples, len(data))
		chunks = append(chunks, data[i:end])
	}

	return chunks
}

func (m *MiniSeedData) EncodeChunk(sequenceNumber int) ([][]byte, error) {
	dataSpanMs := 1000 / m.SampleRate
	var buf [][]byte

	for i, c := range m.chunkInt32Slice(m.Data, MINISEED_CHUNK_SAMPLES) {
		var miniseed mseedio.MiniSeedData
		if err := miniseed.Init(mseedio.STEIM2, mseedio.MSBFIRST); err != nil {
			return nil, err
		}

		startTime := time.UnixMilli(m.Timestamp + int64(i*MINISEED_CHUNK_SAMPLES*dataSpanMs)).UTC()
		if err := miniseed.Append(c, &mseedio.AppendOptions{
			ChannelCode:    m.Channel,
			StationCode:    m.Station,
			LocationCode:   m.Location,
			NetworkCode:    m.Network,
			SampleRate:     float64(m.SampleRate),
			SequenceNumber: fmt.Sprintf("%06d", sequenceNumber),
			StartTime:      startTime,
		}); err != nil {
			return nil, err
		}

		for i := 0; i < len(miniseed.Series); i++ {
			miniseed.Series[i].BlocketteSection.RecordLength = 9
		}

		msData, err := miniseed.Encode(mseedio.OVERWRITE, mseedio.MSBFIRST)
		if err != nil {
			return nil, err
		}

		buf = append(buf, msData)
	}

	return buf, nil
}
```

The above covers the core code analysis. For establishing the TCP connection, the main program, and some necessary template files, I have open-sourced everything in the [AnyShake Nexus](https://github.com/anyshake/nexus) repository. The code is simple and easy to read, so I won’t go into further detail here.

## Test Result

I configured the AnyShake Nexus plugin as a data source in SeisComP.

![SeisComP Configuration](https://assets.n0w0n.com/seiscomp_plugin_impl_in_go/1.png)

After starting the SeedLink module and checking the logs, it is clear that the system correctly recognizes the data stream coming from the plugin.

![SeedLink Module](https://assets.n0w0n.com/seiscomp_plugin_impl_in_go/2.png)

Opening a terminal and running `scrttv` shows the real-time waveform from the plugin—mission accomplished.

![Realtime Waveform](https://assets.n0w0n.com/seiscomp_plugin_impl_in_go/3.png)
