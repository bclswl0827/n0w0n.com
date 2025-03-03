"use strict";(self.webpackChunkn0w0n_blog=self.webpackChunkn0w0n_blog||[]).push([[603],{5449:(e,t,n)=>{n.d(t,{o:()=>w});var s=n(9379),a=n(3986),c=(n(6470),n(6617),n(4319)),l=n(9950),r=n(486),o=n(152),d=n(6315),i=n(7624),m=n(1034),x=n(8992),u=n(4414);const h=["node"],p=["node"],f=["node"],g=["node"],w=e=>{let{className:t,children:n}=e;return(0,l.useEffect)((()=>(c.lX.bind("[data-viewer]"),()=>{c.lX.destroy()})),[]),(0,u.jsx)(r.o,{className:"prose text-md lg:prose-base max-w-[100%] break-words ".concat(null!==t&&void 0!==t?t:""),children:n,components:{a:e=>{let{node:t}=e,n=(0,a.A)(e,h);return(0,u.jsx)("a",(0,s.A)((0,s.A)({href:n.href,target:"_blank",rel:"noreferrer"},n),{},{children:n.children}))},img:e=>{let{node:t}=e,n=(0,a.A)(e,p);return(0,u.jsxs)("a",{className:"flex flex-col items-center",href:n.src,"data-viewer":!0,"data-caption":n.alt,children:[(0,u.jsx)("img",(0,s.A)((0,s.A)({className:"rounded-lg shadow-lg"},n),{},{alt:n.alt})),(0,u.jsx)("span",{className:"-mt-6 text-sm",children:n.alt})]})},pre:e=>{let{node:t}=e,n=(0,a.A)(e,f);return(0,u.jsx)("pre",(0,s.A)({className:"bg-transparent p-2"},n))},code:e=>{let{className:t,children:n}=e;const s=/language-(\w+)/.exec(null!==t&&void 0!==t?t:""),a=null!==s?s[1]:"",c=String(n);return s?(0,u.jsx)(x.C,{language:a,fileName:"snippet_".concat(Date.now(),".txt"),children:c}):(0,u.jsx)("code",{className:"text-gray-700 font-mono overflow-scroll bg-gray-200 px-2 py-0.5 rounded-sm",children:c.replace(/\n$/,"")})},table:e=>{let{node:t}=e,n=(0,a.A)(e,g);return(0,u.jsx)("table",(0,s.A)({className:"overflow-x-auto block whitespace-nowrap"},n))}},urlTransform:e=>e,rehypePlugins:[o.A,d.A],remarkPlugins:[i.A,m.A]})}},2105:(e,t,n)=>{n.d(t,{D:()=>a});var s=n(9699);const a=e=>{const t=new Date(e);return(0,s.A)(t,"yyyy-MM-dd HH:mm:ss")}},4603:(e,t,n)=>{n.r(t),n.d(t,{default:()=>u});var s=n(2631),a=n(4090),c=n.n(a),l=n(9950),r=n(8429),o=n(3306),d=n(5449),i=n(3693),m=n(2105),x=n(4414);const u=()=>{const[e,t]=(0,l.useState)(""),[n,a]=(0,l.useState)({title:"Loading...",created_at:0,updated_at:0,words:0,content:""}),u=(0,r.g)().post;(0,l.useEffect)((()=>{(async e=>{t("");try{const t=await fetch("/data/".concat(e,".json"));a(await t.json())}catch(n){t(String(n))}})(u)}),[u]);const{title:h}=i.e.site_settings;(0,l.useEffect)((()=>{document.title="".concat(n.title," - ").concat(h)}),[n,h]),(0,l.useEffect)((()=>{e.length&&(document.title="Error occurred while loading post - ".concat(h))}),[e,h]);const{pathname:p}=(0,r.zy)();return(0,l.useEffect)((()=>{if(n.content){const e=new URL(window.location.href);e.pathname=p.replace(/\/+$/,""),e.hash="";const t=document.createElement("link");t.href=e.toString(),t.rel="canonical",document.head.appendChild(t)}}),[p,n.content]),(0,l.useEffect)((()=>{const e=document.getElementById("utterances-container");if(n.content&&e){const t=document.createElement("script");t.src="https://utteranc.es/client.js",t.setAttribute("repo","bclswl0827/n0w0n.com"),t.setAttribute("issue-term","pathname"),t.setAttribute("theme","github-light"),t.setAttribute("crossorigin","anonymous"),t.setAttribute("async","true"),null===e||void 0===e||e.appendChild(t)}}),[n.content]),e.length?(0,x.jsx)(o.$,{code:404,debug:e,heading:"404",content:"Resource not found",action:{onClick:()=>window.history.back(),label:"Go back"}}):(0,x.jsxs)("div",{className:"animate-fade flex flex-col items-center space-y-4 mx-12 lg:mx-0",children:[(0,x.jsx)("h1",{className:"text-2xl font-extrabold text-gray-800",children:n.title}),n.content&&(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)("div",{className:"text-sm text-gray-400 flex flex-col sm:flex-row",children:[(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1 sm:mr-2",children:[(0,x.jsx)(c(),{path:s.HL7,size:.7}),(0,x.jsx)("span",{children:(0,m.D)(n.created_at)})]}),n.created_at!==n.updated_at&&(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1 sm:mr-2",children:[(0,x.jsx)(c(),{path:s.rch,size:.7}),(0,x.jsx)("span",{children:(0,m.D)(n.updated_at)})]}),(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1",children:[(0,x.jsx)(c(),{path:s.OKe,size:.7}),(0,x.jsxs)("span",{children:[n.words.toLocaleString()," words"]})]})]}),(0,x.jsx)("div",{className:"py-6 max-w-[calc(95%)] md:max-w-[calc(80%)] lg:max-w-[calc(50%)]",children:(0,x.jsx)(d.o,{children:n.content})}),(0,x.jsx)("div",{id:"utterances-container",className:"w-full"})]})]})}}}]);