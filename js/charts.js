function renderMeridianChart(herbs, filtered) {
  const dom = document.getElementById('meridianChart');
  if (!dom || typeof echarts === 'undefined') return;
  try { echarts.dispose(dom); } catch(e) {}
  const chart = echarts.init(dom);
  const data = (filtered && filtered.length) ? filtered : herbs;
  if (!data.length) { chart.setOption({title:{text:'暂无数据',left:'center',top:'center',textStyle:{fontSize:20,color:'#8b7355'}}}); return; }
  const counts = {};
  data.forEach(h => { if (!h.归经) return; h.归经.replace(/经/g,'').split(/[、,，]/).map(s=>s.trim()).filter(Boolean).forEach(j => { counts[j]=(counts[j]||0)+1; }); });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const cs=['#d4a843','#c49a35','#b58a28','#a67a1e','#976a14','#8b5a0c','#7d4e0a','#6f4208','#613606','#532a04','#451e02','#371200'];
  chart.setOption({tooltip:{trigger:'axis',formatter:'{b}<br/>归经药材：{c} 味'},grid:{left:90,right:40,top:20,bottom:30},xAxis:{type:'value',axisLabel:{fontSize:14,color:'#5a2d0c'},splitLine:{lineStyle:{color:'#e8dcc8',type:'dashed'}}},yAxis:{type:'category',data:sorted.map(([k])=>k+'经'),axisLabel:{fontSize:16,color:'#5a2d0c',fontWeight:'bold',padding:[0,8,0,0]},axisLine:{show:false},axisTick:{show:false}},series:[{type:'bar',data:sorted.map(([,v],i)=>({value:v,itemStyle:{color:cs[i%cs.length],borderRadius:[0,6,6,0]}})),barWidth:26,barMaxWidth:40,label:{show:true,position:'right',fontSize:15,fontWeight:'bold',color:'#5a2d0c',formatter:'{c}味'},animationDuration:500}]},true);
  chart.on('click',(p)=>{if(p.name&&window.__onMeridianClick)window.__onMeridianClick(p.name.replace('经',''))});
  setTimeout(()=>chart.resize(),100);
}

function renderFlavorChart(herb) {
  const dom = document.getElementById('flavorChart');
  if (!dom || typeof echarts === 'undefined') return;
  try { echarts.dispose(dom); } catch(e) {}
  const chart = echarts.init(dom);
  if (!herb||!herb.性味){chart.setOption({title:{text:'点击药材展开查看性味分析',left:'center',top:'center',textStyle:{fontSize:18,color:'#8b7355'}}});return;}
  const xw=herb.性味||'';
  const inds=[];const vals=[];
  [['辛',5],['甘',5],['酸',5],['苦',5],['咸',5],['淡',3],['涩',3]].forEach(([k,v])=>{if(xw.includes(k)){inds.push({name:k,max:v});vals.push(v);}});
  const si=inds.length;inds.push({name:'',max:0});vals.push(0);
  const pm=[['大寒',8],['微寒',4],['寒',6],['大热',8],['热',6],['大温',7],['微温',3],['温',5],['凉',4],['平',3]];
  let f=false;for(const[w,v]of pm){if(xw.includes(w)){inds.push({name:w,max:8});vals.push(v);f=true;break;}}
  if(!f){inds.push({name:'平',max:8});vals.push(3);}
  if(inds.length>si+1){inds.splice(si,1);vals.splice(si,1);}
  if(!inds.length){chart.setOption({title:{text:'暂无数据',left:'center',top:'center',textStyle:{fontSize:18,color:'#8b7355'}}});return;}
  chart.setOption({
    title:{text:herb.药名,subtext:'四气五味：'+herb.性味,left:'center',textStyle:{fontSize:22,color:'#5a2d0c',fontWeight:'bold'},subtextStyle:{fontSize:15,color:'#8b7355'}},
    radar:{indicator:inds,center:['50%','55%'],radius:'62%',name:{textStyle:{fontSize:15,color:'#5a2d0c',fontWeight:'bold',lineHeight:28}}},
    series:[{type:'radar',data:[{value:vals,areaStyle:{color:'rgba(139,69,19,0.15)'},lineStyle:{color:'#8b4513',width:3},itemStyle:{color:'#8b4513'}}]}]
  },true);
  setTimeout(()=>chart.resize(),100);
}
