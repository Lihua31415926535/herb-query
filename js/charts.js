function renderMeridianChart(herbs, filtered) {
  const dom = document.getElementById('meridianChart');
  if (!dom || typeof echarts === 'undefined') return;
  try { echarts.dispose(dom); } catch(e) {}
  const chart = echarts.init(dom);
  const data = (filtered && filtered.length) ? filtered : herbs;
  if (!data.length) { chart.setOption({title:{text:'暂无数据',left:'center',top:'center',textStyle:{fontSize:20,color:'#8b7355'}}}); return; }
  const counts = {};
  data.forEach(h => { if (!h.归经) return; h.归经.replace(/经/g,'').split(/[、,，]/).map(s=>s.trim()).filter(Boolean).forEach(j => { counts[j] = (counts[j]||0)+1; }); });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const colors = ['#d4a843','#c49a35','#b58a28','#a67a1e','#976a14','#8b5a0c','#7d4e0a','#6f4208','#613606','#532a04','#451e02','#371200'];
  chart.setOption({
    tooltip: {trigger:'axis', formatter:'{b}<br/>归经药材：{c} 味'},
    grid: {left:90, right:40, top:20, bottom:30},
    xAxis: {type:'value', axisLabel:{fontSize:14, color:'#5a2d0c'}, splitLine:{lineStyle:{color:'#e8dcc8',type:'dashed'}}},
    yAxis: {type:'category', data: sorted.map(([k])=>k+'经'), axisLabel:{fontSize:16, color:'#5a2d0c', fontWeight:'bold', padding:[0,8,0,0]}, axisLine:{show:false}, axisTick:{show:false}},
    series: [{type:'bar', data:sorted.map(([,v],i)=>({value:v, itemStyle:{color:colors[i%colors.length],borderRadius:[0,6,6,0]}})), barWidth:26, barMaxWidth:40, label:{show:true, position:'right', fontSize:15, fontWeight:'bold', color:'#5a2d0c', formatter:'{c}味'}, animationDuration:500}]
  }, true);
  chart.on('click', (params) => { if (params.name && window.__onMeridianClick) window.__onMeridianClick(params.name.replace('经','')); });
}

function renderFlavorChart(herb) {
  const dom = document.getElementById('flavorChart');
  if (!dom || typeof echarts === 'undefined') return;
  try { echarts.dispose(dom); } catch(e) {}
  const chart = echarts.init(dom);
  
  if (!herb || !herb.性味) {
    chart.setOption({title:{text:'点击任意药材展开详情', subtext:'即可查看性味雷达分析', left:'center', top:'center', textStyle:{fontSize:18,color:'#8b7355'}, subtextStyle:{fontSize:14,color:'#b8a080'}}});
    return;
  }
  
  const xw = herb.性味 || '';
  
  // 五味检测
  const fMap = {辛:5,甘:5,酸:5,苦:5,咸:5,淡:3,涩:3};
  const flavors = Object.entries(fMap).filter(([k]) => xw.includes(k)).map(([k,v]) => ({name:k, max:v, value:v}));
  
  // 四气检测（注意顺序：大/微 在前，避免误判）
  let ping = 0;
  const pMap = [
    ['大寒',8], ['微寒',4], ['寒',6],
    ['大热',8], ['热',6],
    ['大温',7], ['微温',3], ['温',5],
    ['凉',4],
    ['平',3]
  ];
  const props = [];
  for (const [word, val] of pMap) {
    if (xw.includes(word)) {
      props.push({name: word, max: 8, value: val});
      if (word === '平') ping = val;
      break;
    }
  }
  // 如果寒热温凉都没有，设为平
  if (!props.length || (props.length && !['寒','热','温','凉'].some(p => xw.includes(p)))) {
    if (!props.some(p => p.name === '平')) {
      props.push({name: '平', max: 8, value: 3});
    }
  }
  
  if (!flavors.length && !props.length) {
    chart.setOption({title:{text:'暂无性味数据', left:'center', top:'center', textStyle:{fontSize:18,color:'#8b7355'}}});
    return;
  }
  
  // 根据两侧是否有数据决定布局
  const hasF = flavors.length > 0;
  const hasP = props.length > 0;
  
  const radars = [];
  const seriesData = [];
  
  if (hasF && hasP) {
    // 两侧都有 → 左右分栏
    radars.push({indicator: flavors.map(f=>({name:f.name, max:f.max})), center:['25%','55%'], radius:'55%', name:{textStyle:{fontSize:15,color:'#5a2d0c',fontWeight:'bold'}}});
    radars.push({indicator: props.map(p=>({name:p.name, max:p.max})), center:['75%','55%'], radius:'55%', name:{textStyle:{fontSize:15,color:'#5a2d0c',fontWeight:'bold'}}});
    seriesData.push({type:'radar', data:[{value:flavors.map(f=>f.value), areaStyle:{color:'rgba(139,69,19,0.2)'}, lineStyle:{color:'#8b4513',width:3}, itemStyle:{color:'#8b4513'}}]});
    seriesData.push({type:'radar', radarIndex:1, data:[{value:props.map(p=>p.value), areaStyle:{color:'rgba(196,163,90,0.2)'}, lineStyle:{color:'#c4a35a',width:3}, itemStyle:{color:'#c4a35a'}}]});
  } else if (hasF && !hasP) {
    // 只有五味 → 居中大图
    radars.push({indicator: flavors.map(f=>({name:f.name, max:f.max})), center:['50%','55%'], radius:'65%', name:{textStyle:{fontSize:15,color:'#5a2d0c',fontWeight:'bold'}}});
    seriesData.push({type:'radar', data:[{value:flavors.map(f=>f.value), areaStyle:{color:'rgba(139,69,19,0.2)'}, lineStyle:{color:'#8b4513',width:3}, itemStyle:{color:'#8b4513'}}]});
  } else {
    // 只有四气 → 居中大图
    radars.push({indicator: props.map(p=>({name:p.name, max:p.max})), center:['50%','55%'], radius:'65%', name:{textStyle:{fontSize:15,color:'#5a2d0c',fontWeight:'bold'}}});
    seriesData.push({type:'radar', data:[{value:props.map(p=>p.value), areaStyle:{color:'rgba(196,163,90,0.2)'}, lineStyle:{color:'#c4a35a',width:3}, itemStyle:{color:'#c4a35a'}}]});
  }
  
  chart.setOption({
    title: {text: herb.药名+' · 四气五味', subtext: herb.性味, left:'center', textStyle:{fontSize:18,color:'#5a2d0c'}, subtextStyle:{fontSize:16,color:'#8b7355',fontWeight:'bold',lineHeight:30}},
    tooltip: {},
    radar: radars,
    series: seriesData
  }, true);
}
