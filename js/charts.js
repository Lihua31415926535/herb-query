function renderMeridianChart(herbs, filtered) {
  const dom = document.getElementById('meridianChart');
  if (!dom || typeof echarts === 'undefined') return;
  try { echarts.dispose(dom); } catch(e) {}
  const chart = echarts.init(dom);
  
  const data = (filtered && filtered.length) ? filtered : herbs;
  if (!data.length) {
    chart.setOption({title:{text:'暂无数据',left:'center',top:'center',textStyle:{fontSize:20,color:'#8b7355'}}});
    return;
  }
  
  // 统计归经
  const counts = {};
  data.forEach(h => {
    if (!h.归经) return;
    h.归经.replace(/经/g,'').split(/[、,，]/).map(s=>s.trim()).filter(Boolean).forEach(j => {
      counts[j] = (counts[j]||0) + 1;
    });
  });
  
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const mNames = sorted.map(([k]) => k + '经');
  const mCounts = sorted.map(([,v]) => v);
  
  // 颜色渐变 - 从金色到深棕
  const colors = ['#d4a843','#c49a35','#b58a28','#a67a1e','#976a14','#8b5a0c','#7d4e0a','#6f4208','#613606','#532a04','#451e02','#371200'];
  
  chart.setOption({
    tooltip: {trigger:'axis', formatter:'{b}<br/>归经药材：{c} 味'},
    grid: {left:90, right:40, top:20, bottom:30},
    xAxis: {
      type:'value',
      axisLabel:{fontSize:14, color:'#5a2d0c'},
      splitLine:{lineStyle:{color:'#e8dcc8',type:'dashed'}}
    },
    yAxis: {
      type:'category',
      data: mNames,
      axisLabel:{fontSize:16, color:'#5a2d0c', fontWeight:'bold', padding:[0,8,0,0]},
      axisLine:{show:false},
      axisTick:{show:false}
    },
    series: [{
      type:'bar',
      data: mCounts.map((v,i) => ({
        value: v,
        itemStyle: {color: colors[i % colors.length], borderRadius:[0,6,6,0]}
      })),
      barWidth: 26,
      barMaxWidth: 40,
      label: {
        show: true,
        position: 'right',
        fontSize: 15,
        fontWeight: 'bold',
        color: '#5a2d0c',
        formatter: '{c}味'
      },
      animationDuration: 500
    }]
  }, true);
  
  chart.on('click', (params) => {
    if (params.name && window.__onMeridianClick) {
      window.__onMeridianClick(params.name.replace('经',''));
    }
  });
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
  
  const allIndicators = [
    {name:'辛', max:5}, {name:'甘', max:5}, {name:'酸', max:5},
    {name:'苦', max:5}, {name:'咸', max:5}, {name:'淡', max:3}, {name:'涩', max:3},
    {name:'寒', max:8}, {name:'热', max:8}, {name:'温', max:8}, {name:'凉', max:8}, {name:'平', max:8}
  ];
  
  function getVal(keywords) {
    for (const [word, val] of keywords) {
      if (xw.includes(word)) return val;
    }
    return 0;
  }
  
  const values = [
    getVal([['辛',5]]), getVal([['甘',5]]), getVal([['酸',5]]),
    getVal([['苦',5]]), getVal([['咸',5]]), getVal([['淡',3]]), getVal([['涩',3]]),
    getVal([['大寒',8],['寒',6],['微寒',4]]),
    getVal([['大热',8],['热',6]]),
    getVal([['大温',7],['温',5],['微温',3]]),
    getVal([['凉',4]]),
    (xw.includes('平') || !['寒','热','温','凉'].some(p=>xw.includes(p))) ? 3 : 0
  ];
  
  const active = allIndicators.map((ind,i) => ({...ind, value: values[i]})).filter(item => item.value > 0);
  
  if (!active.length) {
    chart.setOption({title:{text:'暂无性味数据', left:'center', top:'center', textStyle:{fontSize:18,color:'#8b7355'}}});
    return;
  }
  
  // 将指标分为两组
  const flavors = active.filter(a => ['辛','甘','酸','苦','咸','淡','涩'].includes(a.name));
  const props = active.filter(a => ['寒','热','温','凉','平'].includes(a.name));
  
  chart.setOption({
    title: {text: herb.药名+' · 四气五味', subtext: '('+herb.性味+')', left:'center', textStyle:{fontSize:18,color:'#5a2d0c'},subtextStyle:{fontSize:15,color:'#8b7355',lineHeight:28}},
    tooltip: {},
    radar: [
      {indicator: flavors.map(f=>({name:f.name,max:f.max})), center:['25%','55%'], radius:'58%', name:{textStyle:{fontSize:16,color:'#5a2d0c',fontWeight:'bold',lineHeight:28}}},
      {indicator: props.map(p=>({name:p.name,max:p.max})), center:['75%','55%'], radius:'58%', name:{textStyle:{fontSize:16,color:'#5a2d0c',fontWeight:'bold',lineHeight:28}}}
    ],
    series: [
      {type:'radar', data:[{value:flavors.map(f=>f.value), areaStyle:{color:'rgba(139,69,19,0.2)'}, lineStyle:{color:'#8b4513',width:3}, itemStyle:{color:'#8b4513'}}]},
      {type:'radar', radarIndex:1, data:[{value:props.map(p=>p.value), areaStyle:{color:'rgba(196,163,90,0.2)'}, lineStyle:{color:'#c4a35a',width:3}, itemStyle:{color:'#c4a35a'}}]}
    ]
  }, true);
}
