// ========== ECharts 归经分布柱状图 ==========
function renderMeridianChart(herbs, filtered) {
  const dom = document.getElementById('meridianChart');
  if (!dom || typeof echarts === 'undefined') return;
  
  try { echarts.dispose(dom); } catch(e) {}
  const chart = echarts.init(dom);
  
  const data = (filtered && filtered.length) ? filtered : herbs;
  if (!data.length) {
    chart.setOption({title:{text:'暂无数据', left:'center', top:'center', textStyle:{fontSize:20,color:'#8b7355'}}});
    return;
  }
  
  // 统计每条归经的药材数
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
  
  chart.setOption({
    tooltip: {trigger:'axis', formatter:'{b}<br/>归经药材：{c} 味'},
    grid: {left:80, right:30, top:20, bottom:30},
    xAxis: {type:'value', axisLabel:{fontSize:13,color:'#5a2d0c'}},
    yAxis: {
      type:'category', data: mNames,
      axisLabel:{fontSize:15,color:'#5a2d0c',fontWeight:'bold'},
      axisLine:{show:false}, axisTick:{show:false}
    },
    series: [{
      type:'bar', data: mCounts,
      barWidth: 22,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0,0,1,0,[
          {offset:0, color:'#c4a35a'}, {offset:1, color:'#8b4513'}
        ]),
        borderRadius: [0,4,4,0]
      },
      label: {show:true, position:'right', fontSize:14, fontWeight:'bold', color:'#5a2d0c'}
    }]
  }, true);
  
  chart.on('click', (params) => {
    // 点击归经柱子，可以触发筛选
    if (params.name) {
      const jing = params.name.replace('经','');
      // 如果定义了回调则调用
      if (window.__onMeridianClick) window.__onMeridianClick(jing);
    }
  });
  
  window.__chartResize = () => chart.resize();
  window.addEventListener('resize', window.__chartResize);
}

// ========== ECharts 性味雷达图（合二为一） ==========
function renderFlavorChart(herb) {
  const dom = document.getElementById('flavorChart');
  if (!dom || typeof echarts === 'undefined') return;
  
  try { echarts.dispose(dom); } catch(e) {}
  const chart = echarts.init(dom);
  
  if (!herb || !herb.性味) {
    chart.setOption({
      title:{text:'点击任意药材展开详情', subtext:'即可查看性味雷达分析', left:'center', top:'center',
             textStyle:{fontSize:18,color:'#8b7355'}, subtextStyle:{fontSize:14,color:'#b8a080'}}
    });
    return;
  }
  
  const xw = herb.性味 || '';
  const indicators = [
    {name:'辛', max:5}, {name:'甘', max:5}, {name:'酸', max:5},
    {name:'苦', max:5}, {name:'咸', max:5}, {name:'淡', max:3},
    {name:'涩', max:3}, {name:'寒', max:8}, {name:'热', max:8},
    {name:'温', max:8}, {name:'凉', max:8}, {name:'平', max:8}
  ];
  const values = [
    xw.includes('辛')?5:0, xw.includes('甘')?5:0, xw.includes('酸')?5:0,
    xw.includes('苦')?5:0, xw.includes('咸')?5:0, xw.includes('淡')?3:0,
    xw.includes('涩')?3:0,
    parseProp(xw,'大寒',8,'寒',6,'微寒',4),
    parseProp(xw,'大热',8,'热',6,null,0),
    parseProp(xw,'大温',7,'温',5,'微温',3),
    xw.includes('凉')?4:0,
    (!['寒','热','温','凉'].some(p => xw.includes(p)) || xw.includes('平')) ? 3 : 0
  ];
  
  function parseProp(str, hk, hv, mk, mv, lk, lv) {
    if (str.includes(hk)) return hv;
    if (str.includes(lk || '___')) return lv || 0;
    if (str.includes(mk)) return mv;
    return 0;
  }
  
  // 过滤掉值为0的指标
  const active = indicators.map((ind, i) => ({...ind, value: values[i]})).filter(item => item.value > 0);
  
  if (!active.length) {
    chart.setOption({title:{text:'暂无性味数据', left:'center', top:'center', textStyle:{fontSize:18,color:'#8b7355'}}});
    return;
  }
  
  chart.setOption({
    title: {text: herb.药名 + ' · 四气五味雷达图', subtext: herb.性味, left:'center',
            textStyle:{fontSize:18,color:'#5a2d0c'}, subtextStyle:{fontSize:15,color:'#8b7355',fontWeight:'bold'}},
    tooltip: {},
    radar: {
      indicator: active.map(a => ({name: a.name + '\n' + a.value, max: a.max})),
      center:['50%','55%'], radius:'65%',
      name: {textStyle:{fontSize:16,color:'#5a2d0c',fontWeight:'bold',lineHeight:28}}
    },
    series: [{
      type:'radar',
      data: [{
        value: active.map(a => a.value),
        areaStyle: {color:'rgba(139,69,19,0.2)'},
        lineStyle: {color:'#8b4513',width:3},
        itemStyle: {color:'#8b4513'}
      }]
    }]
  }, true);
  
  window.__chartResize = () => chart.resize();
  window.addEventListener('resize', window.__chartResize);
}
