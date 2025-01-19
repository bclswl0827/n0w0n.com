import { Markdown } from "../../components/Markdown";

const data = `An end-to-end fullstack developer with bachelor's degree, including the frontend, backend and hardware.

This blog was created to share my practice and experience, you can get the source code [here](https://github.com/bclswl0827/n0w0n.com), it's built with TypeScript, React and Tailwind CSS. Previously I host my blog on \`ibcl.us\`, but the old one was closed due to the pressure of Ministry of State Security of China, beacuse some of the posts *hurt* them lol, **now the old domain no longer belongs to me and it was bought by someone else for scam, so please be aware**.

I usually like to play around with Linux and STM32 / Arduino and some gadgets. I used to be obsessed with radio technology, but now I'm too busy to pay attention to it. BTW, I've been interested in seismology recently and have written some Go libraries libraries that fill a gap in this field.

Finally, I hope this blog can bring you some joy and you can find something useful here.

![My GitHub Illustrations](https://github-readme-stats.vercel.app/api?username=bclswl0827&show_icons=true&bg_color=ffffff&border_color=d0d7de&hide_title=true&disable_animations=true&include_all_commits=true&count_private=true&role=OWNER,COLLABORATOR,ORGANIZATION_MEMBER)

*In order to prevent me from being invited to have coffee with them again, any traffic from China has been blocked now.*
`;

const About = () => {
	return (
		<div className="flex flex-col items-center space-y-8 mx-12 lg:mx-0 animate-fade-right">
			<h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">About me</h1>

			<div className="pt-6 max-w-[calc(95%)] md:max-w-[calc(80%)] lg:max-w-[calc(50%)]">
				<Markdown>{data}</Markdown>
			</div>
		</div>
	);
};

export default About;
