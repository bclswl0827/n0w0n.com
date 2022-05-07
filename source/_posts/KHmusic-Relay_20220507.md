---
title: 拜托，让我清楚地听一回光华之声
date: 2022-05-07 10:58:08
categories: "Docker"
tags:  [广播,原创,Linux,Docker,FFmpeg]
---

# 引子

博主第一次收到光华之声是在小学的时候，在那遥远的 2013 年，当时光华之声的 9745 kHz 还没有被挂掉，每天夜里，伴随着民乐火龙和隔壁 NHK 的强力轰炸，博主只能凭借想象力，艰难地猜测节目在讲什么。

> - 欢迎收听 ... 我是黄萱
> - ... 两岸 ... 大不同
> - 在中国，没有 50 万以上 ... 几乎免谈
> - ... 台湾好行征文活动 ...
> - ... 我们的电邮地址是 lili329@ms45.hinet.net ...

就这样，博主陆陆续续听到 2017 年，但是在 2017 年的某一天，9745 kHz 突然从短波频率上消失了，他走得如此地突然，没有通知，没有人谈论，博主一度怀疑是自己设备出了问题。

在此后的几年里，博主只在中波频率中收到过两三次光华之声的信号。作为一个反贼后浪，光华之声无疑是博主的启蒙导师，他用快、准、狠的手段，将一个祖国未来的小韭菜扼杀在了摇篮中，对于博主来说，实在是意义重大。

一个偶然的机会，去年在网际互联网冲浪时，发现了光华之声主持人陈彦的 Facebook 帐号，在打过招呼过后，博主和她聊了起来，重拾了曾经的回忆。

正值光华网站改版，博主也顺便向她提了建议，希望光华能够自建流媒体服务器，来让中国听友能够顺利地线上收听，陈彦也答应向博主会向电台主管转达建议。

![1](https://c.ibcl.us/KHmusic-Relay_20220507/1.png "1")

前几日博主无意中打开光华之声网站，发现光华之声网站已经加上自家的直播了。但美中不足的是，直播流的 HLS 链接被加上了 Token，还被限制了有效期，这让博主很难受。

要是能拿到一个永久固定的，不需要 Token 就能用的 HLS 地址，那该多好啊。

<!--more-->
# 分析

光华的直播网站位于 [audio.voh.com.tw/KwongWah/m3u8.aspx](https://audio.voh.com.tw/KwongWah/m3u8.aspx)，网站语言为 ASP.NET，HLS 直播地址是由后端分配好 Token 后，嵌入到 `<source>` 标签中的。

换句话说，用户请求 [audio.voh.com.tw/KwongWah/m3u8.aspx](https://audio.voh.com.tw/KwongWah/m3u8.aspx) 后，服务器会返回整个渲染好的 HTML 页面。由于 Token 构造不是在前端完成的，这就让用户没有了自行构造 Token 的机会。

正因为没有自行构造 Token 的机会，所以只能透过解析 HTML 的方式，来获取带有 Token 的 HLS 地址。

最后，博主决定用 Golang 的 Goquery 包来获取带 Token 的 HLS 地址。Goquery 类似 jQuery，它是 jQuery 的 Go 版本实现，使用它，可以很方便的对 HTML 进行处理，同时，鉴于 Golang 的 WORA 特性（Write Once Run Anywhere）, 也极大方便部署。

在获取到 HLS 地址过后，博主打算调用 FFmpeg 自动做转发，并将 TS 分片输出到指定位置，由于光华之声的 HLS 流地址具有时效性，所以还需要计算出 HLS 地址的可用时长，然后在 Token 将要过期时获取新地址，重启 FFmpeg 进程，开始新一轮的转发。

# 需求

综上所述，需要实现如下功能。

 - 透过 Goquery 解析网站，取到 `<source>` 标签中 `src` 的属性，并在 HTTP 请求失败时重试，直到成功为止（一定程度上解决 GFW 干扰）
 - 解析获取到的 HLS 流的 URL 所带的参数，取到 `expires` 参数的值，并同当前时间比较求差值，得到 HLS 地址的有效时长
 - 透过循环来调用 FFmpeg，在 HLS 流快要过期时获取新 URL，并重启 FFmpeg
 - 若 FFmpeg 输出文件夹不存在，则自动创建一个

# 实现

## 保存数据

创建一个全局结构体，用于保存数据。

```go
var config mediaInfo

type mediaInfo struct {
	hlsLink    string // 用于保存获取到的 HLS 链接
	hoursAvail int64  // 用于保存 HLS 可用的时长
	m3u8Dir    string // 指定 FFmpeg 输出文件夹
	ffmpegPath string // 指定 FFmpeg 程序路径
}
```

## 获取 HLS 地址

从 `<source>` 标签中获取 `src` 的属性值，若失败，则始终重试。

```go
func getLink() {
	log.Println("开始解析并获取流媒体地址")
	for {
		// 设置 3 秒超时
		client := http.Client{Timeout: 3 * time.Second}
		res, err := client.Get("https://audio.voh.com.tw/KwongWah/m3u8.aspx")
		if err != nil {
			log.Println("因网络超时而重试中")
			continue
		}
		defer res.Body.Close()

		doc, _ := goquery.NewDocumentFromReader(res.Body)

		// 保存数据
		doc.Find("source").Each(func(i int, s *goquery.Selection) {
			// 获取 HLS 地址
			config.hlsLink, _ = s.Attr("src")
			log.Println(config.hlsLink)
			// 获取过期日期
			config.hoursAvail = validTime(urlPraser(config.hlsLink, "expires"))
			log.Println("上述地址在", config.hoursAvail+1, "小时后过期")
		})
		break
	}
}
```

## 解析 URL 参数

从 URL 提取参数，取到过期时间。

例如 `https://vohradiow-hichannel.cdn.hinet.net/live/RA000077/playlist.m3u8?token=JKAVpqhl4YsInEsqFkFI_g&expires=1652028980`，则取到过期时间为 1652028980（Unix 时间戳）。

```go
func urlPraser(myUrl string, urlParam string) int64 {
	u, err := url.Parse(myUrl)
	if err != nil {
		panic(err)
	}
	p, _ := url.ParseQuery(u.RawQuery)
	// string 转成 int64 类型
	r, _ := strconv.ParseInt(p[urlParam][0], 10, 64)
	return r
}
```

## 计算可用时长

获取直播流可用时长，并提前一小时。

```go
func validTime(uTime int64) int64 {
    // 获取本地 UTC 时间
	currentTime := time.Now().UTC()
	// 解析传入的 Unix 时间戳
	futureTime := time.Unix(uTime, 0).UTC()
	// 求差值，并将 time.Duration 类型转为 int64 类型
	validHours, _ := strconv.ParseInt(fmt.Sprintf("%.f", futureTime.Sub(currentTime).Hours()), 10, 64)
	// 提前一个小时
	return validHours - 1
}
```

## 运行 FFmpeg

在成功获取相关资讯后，调用系统 FFmpeg，开始转发，并将 TS 分片输出到指定位置。

```go
// 运行 FFmpeg
func ffmpeg(hlsLink string, hoursAvail int64, ffmpegPath string, m3u8Dir string) {
	for {
		// 启动 FFmpeg
		args := []string{"-y", "-nostats", "-nostdin", "-hide_banner",
			"-reconnect", "1", "-reconnect_at_eof", "1", "-reconnect_streamed", "1",
			"-reconnect_delay_max", "0", "-timeout", "2000000000", "-thread_queue_size", "5512",
			"-fflags", "+genpts", "-probesize", "10000000", "-analyzeduration", "15000000",
			"-i", hlsLink, "-c", "copy", "-segment_list_flags", "+live", "-hls_time", "4",
			"-hls_list_size", "6", "-hls_wrap", "10", "-segment_list_type", "m3u8",
			"-segment_time", "4", m3u8Dir + "/index.m3u8"}
		cmd := exec.Command(ffmpegPath, args...)
		err := cmd.Start()
		if err != nil {
			log.Fatalf("%s\n", err)
		}
		log.Println("已启动 FFmpeg 做流媒体转发")
		// 等待指定时长，然后结束 FFmpeg 进程
		time.Sleep(time.Duration(hoursAvail) * time.Hour)
		cmd.Process.Kill()
		cmd.Wait()
		// 获取新链接
		getLink()
		log.Println("FFmpeg 因流媒体链接变更而重启")
	}
}

// 判断文件夹是否存在，若不存在则创建
func pathExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}
```

## 主函数

引入 flag 包，获取用户指定的命令行参数，有 `-f` 和 `-h` 两个选项，分别对应 FFMpeg 程序路径和 FFmpeg 转发的流输出路径。

默认情况下，默认 FFmpeg 路径为 `/usr/bin/ffmpeg`，FFmpeg 转发的流输出路径为 `/www/khmusic`。

```go
func main() {
	// 指定命令行默认参数
	flag.StringVar(&config.ffmpegPath, "f", "/usr/bin/ffmpeg", "FFMpeg 路径（绝对路径）")
	flag.StringVar(&config.m3u8Dir, "h", "/www/khmusic", "HLS 流路径（末尾不要有斜杠）")
	flag.Parse()
	log.Println("FFmpeg 路径为", config.ffmpegPath)
	log.Println("HLS 流将会存放至", config.m3u8Dir)

	// 若输出文件夹不存在则创建
	dirExist, err := pathExists(config.m3u8Dir)
	if err != nil {
		panic(err)
	}
	if !dirExist {
		// 创建多级文件夹
		err := os.MkdirAll(config.m3u8Dir, os.ModePerm)
		if err != nil {
			panic(err)
		}
		log.Println("指定文件夹不存在，将会自动创建")
	}

	// 获取流媒体链接
	getLink()
	// 启动 FFmpeg
	ffmpeg(config.hlsLink, config.hoursAvail, config.ffmpegPath, config.m3u8Dir)
}
```

## HTTP 服务器

最后，还需要一个 HTTP 服务来向用户提供串流服务。博主这里使用 Python 自带的 `http.server` 模块来实现。

启动 Python 自带的 HTTP 服务非常简单，只需要一行命令即可，其中，`/www` 是 FFmpeg 转发的流输出路径，`8080` 是监听的 HTTP 端口，`::` 代表监听了所有地址（包含 IPv6）。

```
$ python3 -m http.server -d /www 8080 --bind ::
```

# 部署

博主已将仓库开源至 GitHub，欢迎 Star。

点击 [README.md](https://github.com/bclswl0827/khmusic-forwarder/blob/master/README.md) 中的部署按钮，可以直接部署到 Heroku 上。

博主部署了一个，用着还不错，配合 CloudFlare Workers + 自选 IP 应该会更爽。

 - [khmusic.herokuapp.com/khmusic/index.m3u8](https://khmusic.herokuapp.com/khmusic/index.m3u8)
 - [khmusic.a1.workers.dev/khmusic/index.m3u8](https://khmusic.a1.workers.dev/khmusic/index.m3u8)

如果是部署到自己的服务器上，则只需要将仓库拉取下来用 Docker 构建一下就行了，步骤也很简单。

```shell
$ git clone https://github.com/bclswl0827/khmusic-forwarder
$ cd khmusic-forwarder
$ docker build -t khmusic .
```

部署应用时，如果服务器上已经运行有 HTTP 进程，可以直接将容器的 `/www` 目录挂载到既有的网站目录中，也可选择启动自带的 HTTP 服务，并开放对应端口。

例如直接部署应用到 80 端口，使用自带的 HTTP 服务，需要注意，指定运行自带 HTTP 服务的端口号和指定开放的需要保证相同。

```shell
$ docker run -d \
             --env HTTP_ENABLED=true \
             --env HTTP_PORT=80 \
             --name khmusic \
             --restart always \
             --publish 80:80 \
             khmusic:latest
```

又如利用既有的 HTTP 服务，将容器的 `/www` 目录挂载到既有的网站目录中（例如 `/var/www/live`）。

```shell
$ docker run -d \
             --name khmusic \
             --restart always \
             --volume /var/www/live:/www \
             khmusic:latest
```

# 后记

和光华的一位老听友聊天，才知道他以前已经反馈了很多次，希望光华能有自己的串流。没想到这么多年了才给安排上，想必光华的内部也是一堆鸽王吧。

![2](https://c.ibcl.us/KHmusic-Relay_20220507/2.jpg "2")

同时也要感谢陈彦，在帮忙反馈听友建议之余，还帮博主联系到了已经离职的廖恒。

![3](https://c.ibcl.us/KHmusic-Relay_20220507/3.jpg "3")
