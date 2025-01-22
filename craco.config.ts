import { Feed } from "feed";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { resolve } from "path";
import showdown from "showdown";
import { Configuration, DefinePlugin } from "webpack";
import { parse as YamlParse } from "yaml";

import { GlobalConfig } from "./src/config/global";

const getProtocolPrefix = (https: boolean) => (https ? "https" : "http");

const generatePlainHtml = (
	baseUrl: string,
	siteTitle: string,
	postTitle: string,
	postHtml: string
) =>
	`<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${postTitle} - ${siteTitle}</title>
    </head>
    <body>
        <noscript>
            <h1>${postTitle}</h1>
            <article>${postHtml}</article>
        </noscript>
        <script>
            (() => {
                const main = () => {
                    document.title = "Redirecting... - ${siteTitle}";
                    document.body.innerText = "Redirecting...";
                    const url = new URL(window.location.href);
                    url.hash = url.pathname.replace("index.html", "");
                    url.pathname = "${baseUrl}";
                    window.location.href = url.href;
                };

                main();
            })();
        </script>
    </body>
</html>`;

const handleBlogPosts = () => {
	const htmlRender = new showdown.Converter();
	htmlRender.setOption("tables", true);

	const rssFeed = new Feed({
		updated: new Date(),
		language: GlobalConfig.site_settings.language,
		title: GlobalConfig.site_settings.title,
		id: `${getProtocolPrefix(GlobalConfig.site_settings.https)}${
			GlobalConfig.site_settings.domain
		}${GlobalConfig.site_settings.base}`,
		link: `${getProtocolPrefix(GlobalConfig.site_settings.https)}${
			GlobalConfig.site_settings.domain
		}${GlobalConfig.site_settings.base}`,
		copyright: GlobalConfig.site_settings.tos,
		image: GlobalConfig.author_settings.avatar,
		generator: GlobalConfig.site_settings.title,
		author: { name: GlobalConfig.author_settings.name },
		feedLinks: {
			atom: `${getProtocolPrefix(GlobalConfig.site_settings.https)}://${
				GlobalConfig.site_settings.domain
			}${GlobalConfig.site_settings.base}atom.xml`,
			rss: `${getProtocolPrefix(GlobalConfig.site_settings.https)}://${
				GlobalConfig.site_settings.domain
			}${GlobalConfig.site_settings.base}rss.xml`,
			json: `${getProtocolPrefix(GlobalConfig.site_settings.https)}://${
				GlobalConfig.site_settings.domain
			}${GlobalConfig.site_settings.base}feed.json`
		}
	});

	// Get all posts metadata
	const posts = readdirSync(resolve(__dirname, "./posts"))
		.filter((file) => file.endsWith(".md"))
		.map((file) => {
			const uniqueId = file.replace(".md", "");
			const modifiedDate = statSync(resolve(__dirname, "./posts", file)).mtime;

			const rawText = readFileSync(resolve(__dirname, "./posts", file), "utf-8");
			const metadata = rawText.match(/\s*---([\s\S]*?)---\s/);
			if (!metadata || metadata.length < 2) {
				throw new Error(`No metadata found in ${file}`);
			}

			const metedataObj = YamlParse(metadata[1]);
			const summary = rawText.slice(
				metadata[0].length,
				rawText.match(/<!--(.?)+more(.?)+-->/)?.index ?? rawText.length
			);

			const postDate = new Date(metedataObj.date);
			const postContent = rawText
				.slice(metadata[0].length)
				.replace(/<!--(.?)+more(.?)+-->/, "");
			const postContentHtml = htmlRender.makeHtml(postContent);

			rssFeed.addItem({
				title: metedataObj.title,
				id: uniqueId,
				link: `${getProtocolPrefix(GlobalConfig.site_settings.https)}://${
					GlobalConfig.site_settings.domain
				}${GlobalConfig.site_settings.base}post/${uniqueId}`,
				description: htmlRender.makeHtml(summary),
				content: postContentHtml,
				date: postDate
			});

			mkdirSync(resolve(__dirname, `./public/post/${uniqueId}`), { recursive: true });
			writeFileSync(
				resolve(__dirname, `./public/post/${uniqueId}`, `index.html`),
				generatePlainHtml(
					GlobalConfig.site_settings.base,
					GlobalConfig.site_settings.title,
					metedataObj.title,
					postContentHtml
				)
			);

			mkdirSync(resolve(__dirname, "./public/data"), { recursive: true });
			writeFileSync(
				resolve(__dirname, "./public/data", `${uniqueId}.json`),
				JSON.stringify({
					title: metedataObj.title,
					created_at: postDate.getTime(),
					updated_at: modifiedDate.getTime(),
					content: postContent,
					words: rawText.length
				})
			);

			return {
				title: metedataObj.title,
				created_at: postDate.getTime(),
				updated_at: modifiedDate.getTime(),
				slug: uniqueId,
				summary: summary,
				words: rawText.length
			};
		})
		.sort((a, b) => b.created_at - a.created_at);

	// Generate RSS feed
	rssFeed.items.sort((a, b) => b.date.getTime() - a.date.getTime());
	writeFileSync(resolve(__dirname, "./public/atom.xml"), rssFeed.atom1());
	writeFileSync(resolve(__dirname, "./public/rss.xml"), rssFeed.rss2());
	writeFileSync(resolve(__dirname, "./public/feed.json"), rssFeed.json1());

	return posts;
};

module.exports = {
	webpack: {
		configure: (webpackConfig: Configuration) => {
			webpackConfig.plugins?.push(
				new DefinePlugin({
					"process.env.__POSTS__": JSON.stringify(handleBlogPosts())
				})
			);

			return webpackConfig;
		}
	}
};
