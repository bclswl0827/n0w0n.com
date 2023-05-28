---
title: 老乡别走：搭建自己的 Telegram 可转债机器人
date: 2023-05-24 22:56:42
categories: "股市"
tags:
  - 股票
  - 可转债
  - A 股
  - 韭菜
  - Golang
  - Telegram 机器人
---

在博主的高中时代，曾经意外接触到一本名为「段子手股民的忏悔录」的书，出于兴趣，在博主满 18 岁那天的早上，便果断给自己开了一个股票账户，从此入坑大 A 股海。

由于博主资金体量不大，而大 A 市场也不能以零股形式交易，所以博主长期以来的持仓，都只能靠几只稳如老狗的银行股和几个行业 ETF 苟活。直到有一天，博主在刷雪球时看到，原来像博主这样的小散户，还能透过可转债打新的方式，靠运气赚点零花钱。

不幸的是，可转债这种东西，并不是每天都能申购的。作为一个懒人，每天一早打开炒股软件，生无可恋地看一眼自己绿油油的收益，再去看有没有能申购的新可转债，实在是一件很痛苦的事情。

多亏博主心理比较强大，也坚信价值投资的意义，否则就成为被收割的韭菜了。在痛苦之余，博主也曾思考，能否写一个小程序，获取每日的可转债并通知博主申购呢？

也好在博主是 Telegram 的常驻用户，同时，Telegram 也提供了健全的生态，以支援平台下的机器人开发，于是博主萌生了写一个 Telegram 可转债机器人的想法。

这篇文章，将会分享博主编写简单的 Telegram 可转债机器人时的一些思路，并介绍如何将其搭建在云服务器上，实现每天给自己或是往几个朋友组建的小群里自动推送可供当日申购的可转债，推动「共同富裕」。

![博主 2022 打新收益](https://c.ibcl.us/BondBot-Telegram_20230524/1.jpg)

<!-- more -->

# 寻找数据来源

既然需要推送当日可转债，那就需要一个靠谱的数据来源了。在博主综合比较多个网站过后，最后瞄准了东方财富的[新股申购与中签查询](https://data.eastmoney.com/xg/xg/?mkt=kzz)。

东方财富的债券接口是 `https://datacenter-web.eastmoney.com/api/data/v1/get`，请求方法为 GET。除此之外，在请求时，还需要带上一些额外的参数才能正确响应。

经过博主摸索和测试，最后总结出来可用于获取可转债列表的接口调用方法如下。

```
GET https://datacenter-web.eastmoney.com/api/data/v1/get?callback=_&sortColumns=PUBLIC_START_DATE&sortTypes=-1&pageNumber=1&quoteType=0&reportName=RPT_BOND_CB_LIST&columns=ALL&quoteColumns=f2~01~CONVERT_STOCK_CODE~CONVERT_STOCK_PRICE,f235~10~SECURITY_CODE~TRANSFER_PRICE,f236~10~SECURITY_CODE~TRANSFER_VALUE,f2~10~SECURITY_CODE~CURRENT_BOND_PRICE,f237~10~SECURITY_CODE~TRANSFER_PREMIUM_RATIO,f239~10~SECURITY_CODE~RESALE_TRIG_PRICE,f240~10~SECURITY_CODE~REDEEM_TRIG_PRICE,f23~01~CONVERT_STOCK_CODE~PBV_RATIO
```

此外，由于东方财富的可转债接口为了实现跨域请求，返回值没有使用日常开发常用的 JSON 格式，而是使用了 JSONP 格式，将数据包裹在 `_` 这个 callback 中。

# 解析 JSONP

博主决定使用 Golang 来实现这个小需求，但是苦于 Golang 中的标准库没有提供 JSONP 的解析方式，所以还需要博主自行编写一个包装器来解析。

```go
type JsonpWrapper struct {
	Prefix     string    // 指定 callback 前缀
	Underlying io.Reader // 在底层提供 JSONP 数据

	gotPrefix bool       // 指示是否读到 callback
}
```

假设 `JsonpWrapper` 的实例化后的名称为 `jpw`，那么实现 `jpw.Read()` 方法的流程如下所述。

 1. 若已读取过前缀（即 `jpw.gotPrefix` 为 `true`，则直接调用 `jpw.Underlying.Read(b)` 从底层的 JSONP 数据源读取数据，并返回结果；若未读取过前缀，则创建一个与前缀长度相同的字节数组 `prefix`
 2. 调用 `io.ReadFull` 方法从 `jpw.Underlying` 中读取与前缀长度相同的字节，并将结果存储在 `prefix` 中
 3. 若读取前缀的结果与指定的前缀字符串 `jpw.Prefix` 不同，则返回读取的字节数 n 和错误，表明前缀不匹配
 4. 若读取到的前缀与指定前缀相同，则创建一个长度为 1 的字节数组 `char`
 5. 连续从 `jpw.Underlying` 中逐字节读取，并将结果存储在 `char` 中，直到遇到 `(` 字符为止
 6. 将 `jpw.gotPrefix` 设置为 `true`，标记已经读取到了前缀
 7. 调用 `jpw.Underlying.Read(b)` 从底层数据源读取数据，并返回结果

根据上述流程，可以编写如下代码。

```go
func (jpw *JsonpWrapper) Read(b []byte) (int, error) {
	if jpw.gotPrefix {
		return jpw.Underlying.Read(b)
	}

	prefix := make([]byte, len(jpw.Prefix))
	n, err := io.ReadFull(jpw.Underlying, prefix)
	if err != nil {
		return n, err
	}

	if string(prefix) != jpw.Prefix {
		return n, fmt.Errorf(
            "JSONP prefix mismatch: expected %q, got %q",
			jpw.Prefix, prefix)
	}

	char := make([]byte, 1)
	for char[0] != '(' {
		n, err = jpw.Underlying.Read(char)
		if n == 0 || err != nil {
			return n, err
		}
	}

	jpw.gotPrefix = true
	return jpw.Underlying.Read(b)
}
```

接下来就可以使用 `JsonpWrapper` 来解析 JSONP 数据了。例如，有一串 JSONP 数据如下所示。

```js
_({"data":[],"success":true})
```

那么可以使用如下方法来解析。

```go
r := strings.NewReader(`_({"data":[1, 2, 3],"success":true})`)

var data struct {
    Data            []any `json:"data"`
    Success bool    `json:"success"`
}

err := json.NewDecoder(&JsonpWrapper{
    Prefix:     "_", // 指定 callback 名称，需要与 JSONP 数据中的前缀相同
    Underlying: r, // 透过 strings.NewReader() 实现 io.Reader 接口
}).Decode(&data)
if err != nil {
    panic(err)
}
```

# 略过节假日

由于节假日是不会开市的，所以在获取可转债列表时，需要略过节假日，以避免多余的推送打扰了在节假日休息的博主。

麻烦的是，除了日常的周末外，还有一些特殊的节假日，例如春节、劳动节等，为了避免麻烦，所以博主决定用别人写好的库来判断是否为节假日，这里使用的是 [go-workingday](https://github.com/Admingyu/go-workingday)。

[go-workingday](https://github.com/Admingyu/go-workingday) 的调用方法也很简单，只需要调用 `workingday.IsWorkDay()` 方法，传入日期和地区即可，例如 `workingday.IsWorkDay(time.Now(), "CN")`。

博主在阅读了这个库的源码后，发现这个库的实现也很简单粗暴，原理是请求了一个网上的 [API](http://pc.suishenyun.net/peacock/api/h5/festival) 来判断是否为节假日。

# 对接 Telegram

这里用到了 [telegram-bot-api](https://github.com/go-telegram-bot-api/telegram-bot-api) 这个库，这个库的使用方法也很简单，只需要调用 `tgbotapi.NewBotAPI()` 方法，传入 Bot Token 即可完成 Bot 的实例化。

示例代码如下，博主按照[这个教程](https://ithelp.ithome.com.tw/m/articles/10262881)申请了一个 Telegram Bot，然后将 Bot Token 传入 `tgbotapi.NewBotAPI()` 方法即可完成对接，向指定用户发送消息。

需要注意，由于 Telegram 在中国被屏蔽，所以需要使用代理才能正常使用。所以博主在运行程序前，需要设置 `HTTPS_PROXY` 环境变量，例如在 Linux 下运行 `export HTTPS_PROXY=http://127.0.0.1:10809` 命令。

```go
// 初始化 Bot
// 假设 Bot Token 为 123456789:abcdefghijklmnopqrstuvwxyz
bot, err := tgbotapi.NewBotAPI("123456789:abcdefghijklmnopqrstuvwxyz")
if err != nil {
    panic(err)
}

// 获取消息间隔
u := tgbotapi.NewUpdate(0)
// 设定超时
u.Timeout = 10

// 向用户发送消息
// 假设用户的 ID 为 987654321
msg := tgbotapi.NewMessage(
    987654321, "Hello World!",
)
bot.Send(msg)
```

至于如何取得用户或群组 ID，可以参考[这篇教程](https://web.archive.org/web/20230521060656/https://ww.sjfn.com/post/telegram-get-id.html)。

# 成品和实战

博主已经将上述的代码整合到了一个完整的程序中，可以在 [GitHub - bclswl0827/bond-bot](https://github.com/bclswl0827/bond-bot) 找到。

由于博主的朋友也在打新可转债，所以博主将程序部署到了自己的云服务器上，每天早上 9 点 30 分自动推送可转债列表，以便大家及时了解可转债的情况。

用户可以自行决定推送的时间，例如在每天 10 点整推送可转债信息，只需要修改 `config.json` 配置文件即可，配置文件中的时间一律为北京时间。

```json
{
    "token": "123456789:abcdefghijklmnopqrstuvwxyz",
    "chat_id": 987654321,
    "hour": 10,
    "minute": 0
}
```

最后附上推送效果截图。

![中签的博主](https://c.ibcl.us/BondBot-Telegram_20230524/2.png)
