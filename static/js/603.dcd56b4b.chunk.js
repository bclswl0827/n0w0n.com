"use strict";(self.webpackChunkn0w0n_blog=self.webpackChunkn0w0n_blog||[]).push([[603],{5449:(e,t,s)=>{s.d(t,{o:()=>w});var n=s(9379),a=s(3986),c=(s(6470),s(6617),s(4319)),l=s(9950),r=s(486),o=s(152),d=s(6315),i=s(7624),m=s(1034),x=s(8992),u=s(4414);const h=["node"],p=["node"],f=["node"],g=["node"],w=e=>{let{className:t,children:s}=e;return(0,l.useEffect)((()=>(c.lX.bind("[data-viewer]"),()=>{c.lX.destroy()})),[]),(0,u.jsx)(r.o,{className:"prose text-md lg:prose-base max-w-[100%] break-words ".concat(null!==t&&void 0!==t?t:""),children:s,components:{a:e=>{let{node:t}=e,s=(0,a.A)(e,h);return(0,u.jsx)("a",(0,n.A)((0,n.A)({href:s.href,target:"_blank",rel:"noreferrer"},s),{},{children:s.children}))},img:e=>{let{node:t}=e,s=(0,a.A)(e,p);return(0,u.jsxs)("a",{className:"flex flex-col items-center",href:s.src,"data-viewer":!0,"data-caption":s.alt,children:[(0,u.jsx)("img",(0,n.A)((0,n.A)({className:"rounded-lg shadow-lg"},s),{},{alt:s.alt})),(0,u.jsx)("span",{className:"-mt-6 text-sm",children:s.alt})]})},pre:e=>{let{node:t}=e,s=(0,a.A)(e,f);return(0,u.jsx)("pre",(0,n.A)({className:"bg-transparent p-2"},s))},code:e=>{let{className:t,children:s}=e;const n=/language-(\w+)/.exec(null!==t&&void 0!==t?t:""),a=null!==n?n[1]:"",c=String(s);return n?(0,u.jsx)(x.C,{language:a,fileName:"snippet_".concat(Date.now(),".txt"),children:c}):(0,u.jsx)("code",{className:"text-gray-700 font-mono overflow-scroll bg-gray-200 px-2 py-0.5 rounded-sm",children:c.replace(/\n$/,"")})},table:e=>{let{node:t}=e,s=(0,a.A)(e,g);return(0,u.jsx)("table",(0,n.A)({className:"overflow-x-auto block whitespace-nowrap"},s))}},urlTransform:e=>e,rehypePlugins:[o.A,d.A],remarkPlugins:[i.A,m.A]})}},2105:(e,t,s)=>{s.d(t,{D:()=>a});var n=s(9699);const a=e=>{const t=new Date(e);return(0,n.A)(t,"yyyy-MM-dd HH:mm:ss")}},4603:(e,t,s)=>{s.r(t),s.d(t,{default:()=>u});var n=s(2631),a=s(4090),c=s.n(a),l=s(9950),r=s(8429),o=s(3306),d=s(5449),i=s(3693),m=s(2105),x=s(4414);const u=()=>{const[e,t]=(0,l.useState)(""),[s,a]=(0,l.useState)({title:"Loading...",created_at:0,updated_at:0,words:0,content:""}),u=(0,r.g)().post;(0,l.useEffect)((()=>{(async e=>{t("");try{const t=await fetch("/data/".concat(e,".json"));a(await t.json())}catch(s){t(String(s))}})(u)}),[u]);const{title:h}=i.e.site_settings;(0,l.useEffect)((()=>{document.title="".concat(s.title," - ").concat(h)}),[s,h]),(0,l.useEffect)((()=>{e.length&&(document.title="Error occurred while loading post - ".concat(h))}),[e,h]);const{pathname:p}=(0,r.zy)();return(0,l.useEffect)((()=>{const e=new URL(window.location.href);e.pathname=p.replace(/\/+$/,""),e.hash="";const t=document.createElement("link");t.href=e.toString(),t.rel="canonical",document.head.appendChild(t)}),[p]),(0,l.useEffect)((()=>{const e=document.getElementById("utterances-container");if(s.content&&e){const t=document.createElement("script");t.src="https://utteranc.es/client.js",t.setAttribute("repo","bclswl0827/n0w0n.com"),t.setAttribute("issue-term","pathname"),t.setAttribute("theme","github-light"),t.setAttribute("crossorigin","anonymous"),t.setAttribute("async","true"),null===e||void 0===e||e.appendChild(t)}}),[s]),e.length?(0,x.jsx)(o.$,{code:404,debug:e,heading:"404",content:"Resource not found",action:{onClick:()=>window.history.back(),label:"Go back"}}):(0,x.jsxs)("div",{className:"animate-fade flex flex-col items-center space-y-4 mx-12 lg:mx-0",children:[(0,x.jsx)("h1",{className:"text-2xl font-extrabold text-gray-800",children:s.title}),s.content&&(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)("div",{className:"text-sm text-gray-400 flex flex-col sm:flex-row",children:[(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1 sm:mr-2",children:[(0,x.jsx)(c(),{path:n.HL7,size:.7}),(0,x.jsx)("span",{children:(0,m.D)(s.created_at)})]}),s.created_at!==s.updated_at&&(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1 sm:mr-2",children:[(0,x.jsx)(c(),{path:n.rch,size:.7}),(0,x.jsx)("span",{children:(0,m.D)(s.updated_at)})]}),(0,x.jsxs)("div",{className:"flex flex-row items-center space-x-1",children:[(0,x.jsx)(c(),{path:n.OKe,size:.7}),(0,x.jsxs)("span",{children:[s.words.toLocaleString()," words"]})]})]}),(0,x.jsx)("div",{className:"py-6 max-w-[calc(95%)] md:max-w-[calc(80%)] lg:max-w-[calc(50%)]",children:(0,x.jsx)(d.o,{children:s.content})}),(0,x.jsx)("div",{id:"utterances-container",className:"w-full"})]})]})}}}]);