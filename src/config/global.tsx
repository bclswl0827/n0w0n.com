import { mdiChat, mdiGithub, mdiRssBox } from "@mdi/js";

export const GlobalConfig = {
	site_settings: {
		base: "/",
		domain: "n0w0n.com",
		https: true,
		title: "The [object Object]",
		description: "Uncaught Error: No silver bullet, but a lot of lead bullets",
		language: "en",
		tos: `Posts are available under the Creative Commons Attribution-ShareAlike License 4.0, additional terms may apply.`
	},
	author_settings: {
		name: "Unknown netizen",
		description: "I didn't pass the Turing test",
		links: [
			{
				icon: mdiGithub,
				name: "GitHub",
				link: "https://github.com/bclswl0827"
			},
			{
				icon: mdiChat,
				name: "Telegram",
				link: "https://t.me/ttyAMA0"
			},
			{
				icon: mdiRssBox,
				name: "RSS",
				link: "/atom.xml"
			}
		],
		avatar: "/avatar.jpg"
	}
};
