// Deterministic platform HTTP fixture, shared by the background unit tests.
const bvid = 'BV1a6Yx62EH4';
function fixture({part=2,player={},view={},body,tracks,fallback={code:0,data:{subtitle:{subtitles:[]}}}}={}) {
  const calls=[];
  const response = payload => ({ok:true,json:async()=>payload});
  const fetchImpl=async (input,options)=>{
    const url=new URL(input);calls.push({url,options});
    if(url.pathname==='/x/web-interface/view')return response({code:0,data:{aid:123,bvid,title:'课程',owner:{name:'老师',mid:99},pages:[{page:part,cid:456,duration:60}],...view}});
    if(url.pathname==='/x/web-interface/nav')return response({code:-101,data:{wbi_img:{img_url:`https://i0.hdslb.com/${'a'.repeat(32)}.png`,sub_url:`https://i0.hdslb.com/${'b'.repeat(32)}.png`}}});
    if(url.pathname==='/x/player/wbi/v2')return response({code:0,data:{aid:123,bvid,cid:456,subtitle:{subtitles:tracks??[{id:1,lan:'zh-CN',lan_doc:'中文',subtitle_url:'https://aisubtitle.hdslb.com/test.json?auth_key=fixture'}]},...player}});
    if(url.pathname==='/x/v2/subtitle/web/view')return fallback instanceof Uint8Array ? {ok:true,arrayBuffer:async()=>fallback.buffer.slice(fallback.byteOffset,fallback.byteOffset+fallback.byteLength)} : response(fallback);
    if(url.hostname==='aisubtitle.hdslb.com')return response({body:body??[{from:0,to:2,content:'字幕'}]});
    throw Error('Unexpected fixture request');
  };
  return {fetchImpl,calls};
}
module.exports={fixture,bvid};
