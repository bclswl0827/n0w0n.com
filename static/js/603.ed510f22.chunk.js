"use strict";(self.webpackChunkn0w0n_blog=self.webpackChunkn0w0n_blog||[]).push([[603],{5449:(e,t,s)=>{s.d(t,{o:()=>w});var a=s(9379),n=s(3986),c=(s(6470),s(6617),s(4319)),r=s(9950),l=s(486),o=s(152),d=s(6315),i=s(7624),m=s(1034),x=s(8992),u=s(4414);const h=["node"],p=["node"],f=["node"],g=["node"],w=e=>{let{className:t,children:s}=e;return(0,r.useEffect)((()=>(c.lX.bind("[data-viewer]"),()=>{c.lX.destroy()})),[]),(0,u.jsx)(l.o,{className:"prose text-md lg:prose-base max-w-[100%] break-words ".concat(null!==t&&void 0!==t?t:""),children:s,components:{a:e=>{let{node:t}=e,s=(0,n.A)(e,h);return(0,u.jsx)("a",(0,a.A)((0,a.A)({href:s.href,target:"_blank",rel:"noreferrer"},s),{},{children:s.children}))},img:e=>{let{node:t}=e,s=(0,n.A)(e,p);return(0,u.jsxs)("a",{className:"flex flex-col items-center",href:s.src,"data-viewer":!0,"data-caption":s.alt,children:[(0,u.jsx)("img",(0,a.A)((0,a.A)({className:"rounded-lg shadow-lg"},s),{},{alt:s.alt})),(0,u.jsx)("span",{className:"-mt-6 text-sm",children:s.alt})]})},pre:e=>{let{node:t}=e,s=(0,n.A)(e,f);return(0,u.jsx)("pre",(0,a.A)({className:"bg-transparent p-2"},s))},code:e=>{let{className:t,children:s}=e;const a=/language-(\w+)/.exec(null!==t&&void 0!==t?t:""),n=null!==a?a[1]:"",c=String(s);return a?(0,u.jsx)(x.C,{language:n,fileName:"snippet_".concat(Date.now(),".txt"),children:c}):(0,u.jsx)("code",{className:"text-gray-700 font-mono overflow-scroll bg-gray-200 px-2 py-0.5 rounded-sm",children:c.replace(/\n$/,"")})},table:e=>{let{node:t}=e,s=(0,n.A)(e,g);return(0,u.jsx)("table",(0,a.A)({className:"overflow-x-auto block whitespace-nowrap"},s))}},urlTransform:e=>e,rehypePlugins:[o.A,d.A],remarkPlugins:[i.A,m.A]})}},2105:(e,t,s)=>{s.d(t,{D:()=>n});var a=s(9699);const n=e=>{const t=new Date(e);return(0,a.A)(t,"yyyy-MM-dd HH:mm:ss")}},4603:(e,t,s)=>{s.r(t),s.d(t,{default:()=>u});var a=s(2631),n=s(4090),c=s.n(n),r=s(9950),l=s(8429),o=s(3306),d=s(5449),i=s(3693),m=s(2105),x=s(4414);const u=()=>{const[e,t]=(0,r.useState)(""),[s,n]=(0,r.useState)({title:"Loading...",created_at:0,updated_at:0,words:0,content:""}),u=(0,l.g)().post;(0,r.useEffect)((()=>{(async e=>{t("");try{const t=await fetch("/data/".concat(e,".json"));n(await t.json())}catch(s){t(String(s))}})(u)}),[u]);const{title:h}=i.e.site_settings;return(0,r.useEffect)((()=>{document.title="".concat(s.title," - ").concat(h)}),[s,h]),(0,r.useEffect)((()=>{e.length&&(document.title="Error occurred while loading post - ".concat(h))}),[e,h]),(0,r.useEffect)((()=>{const e=document.getElementById("utterances-container");if(s.content&&e){const t=document.createElement("script");t.src="https://utteranc.es/client.js",t.setAttribute("repo","bclswl0827/n0w0n.com"),t.setAttribute("issue-term","pathname"),t.setAttribute("theme","github-light"),t.setAttribute("crossorigin","anonymous"),t.setAttribute("async","true"),null===e||void 0===e||e.appendChild(t)}}),[s]),e.length?(0,x.jsx)(o.$,{code:404,debug:e,heading:"404",content:"Resource not found",action:{onClick:()=>window.history.back(),label:"Go back"}}):(0,x.jsxs)("div",{className:"animate-fade flex flex-col items-center space-y-4 mx-12 lg:mx-0",children:[(0,x.jsx)("h1",{className:"text-2xl font-extrabold text-gray-800",children:s.title}),s.content&&(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)("div",{className:"text-sm text-gray-400 flex flex-col sm:flex-row",children:[(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1 sm:mr-2",children:[(0,x.jsx)(c(),{path:a.HL7,size:.7}),(0,x.jsx)("span",{children:(0,m.D)(s.created_at)})]}),s.created_at!==s.updated_at&&(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1 sm:mr-2",children:[(0,x.jsx)(c(),{path:a.rch,size:.7}),(0,x.jsx)("span",{children:(0,m.D)(s.updated_at)})]}),(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1",children:[(0,x.jsx)(c(),{path:a.OKe,size:.7}),(0,x.jsxs)("span",{children:[s.words.toLocaleString()," words"]})]})]}),(0,x.jsx)("div",{className:"py-6 max-w-[calc(95%)] md:max-w-[calc(80%)] lg:max-w-[calc(50%)]",children:(0,x.jsx)(d.o,{children:s.content})}),(0,x.jsx)("div",{id:"utterances-container",className:"w-full"})]})]})}}}]);