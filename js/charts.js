// ========== ECharts 归经桑基图 ==========
function renderMeridianChart(herbs, filtered) {
  const dom = document.getElementById('meridianChart');
  if (!dom || typeof echarts === 'undefined') return;
  
  // 销毁旧实例再重建，避免残留
  echarts.dispose(dom);
  const chart = echarts.init(dom);
  
  const data = (filtered && filtered.length) ? filtered : herbs;
  if (!data.length) {
    chart.setOption({title: {text: '暂无数据', left: 'center', top: 'center', textStyle: {fontSize:14,color:'#8b7355'}}});
    return;
  }
  
  const seen = new Set();
  const nodeMap = {};
  const nodes = [];
  const links = [];
  const meridianCounts = {};
  
  data.forEach(h => {
    if (!h.归经 || seen.has(h.药名)) return;
    seen.add(h.药名);
    const jings = h.归经.replace(/经/g,'').split(/[、,，]/).map(s => s.trim()).filter(Boolean);
    jings.forEach(j => {
      meridianCounts[j] = (meridianCounts[j] || 0) + 1;
      if (!nodeMap['h_' + h.药名]) {
        nodeMap['h_' + h.药名] = true;
        nodes.push({name: h.药名, itemStyle:{color:'#8b4513'}, label:{fontSize:10}});
      }
      const mName = j + '经';
      if (!nodeMap['m_' + mName]) {
        nodeMap['m_' + mName] = true;
        nodes.push({name: mName, itemStyle:{color:'#c4a35a'}});
      }
      links.push({source: h.药名, target: mName});
    });
  });
  
  if (nodes.length < 4) {
    chart.setOption({title: {text: '选择药材以查看归经关系', left:'center', top:'center', textStyle:{fontSize:13,color:'#8b7355'}}});
    return;
  }
  
  chart.setOption({
    tooltip: {trigger:'item', formatter:'{b}'},
    series: [{
      type:'sankey', layout:'none', emphasis:{focus:'adjacency'},
      nodeAlign:'left', nodeWidth:10, nodeGap:8,
      data: nodes, links: links,
      label: {fontSize: 10, color: '#5a2d0c'}
    }]
  }, true);
  
  // 窗口resize自适应
  window.addEventListener('resize', () => chart.resize());
}

// ========== ECharts 雷达图（四气五味） ==========
function renderFlavorChart(herb) {
  const dom = document.getElementById('flavorChart');
  if (!dom || typeof echarts === 'undefined') return;
  
  echarts.dispose(dom);
  const chart = echarts.init(dom);
  
  if (!herb || !herb.性味) {
    chart.setOption({title:{text:'点击药材查看性味分析', left:'center', top:'center', textStyle:{fontSize:13,color:'#8b7355'}}});
    return;
  }
  
  const xw = herb.性味 || '';
  const flavors = {辛:0,甘:0,酸:0,苦:0,咸:0,淡:0,涩:0};
  const props = {寒:0,热:0,温:0,凉:0,平:0};
  
  if (xw.includes('辛')) flavors['辛'] = 5;
  if (xw.includes('甘')) flavors['甘'] = 5;
  if (xw.includes('酸')) flavors['酸'] = 5;
  if (xw.includes('苦')) flavors['苦'] = 5;
  if (xw.includes('咸')) flavors['咸'] = 5;
  if (xw.includes('淡')) flavors['淡'] = 3;
  if (xw.includes('涩')) flavors['涩'] = 3;
  
  if (xw.includes('大寒')) props['寒'] = 8;
  else if (xw.includes('寒')) props['寒'] = xw.includes('微寒') ? 4 : 6;
  if (xw.includes('大热')) props['热'] = 8;
  else if (xw.includes('热')) props['热'] = 6;
  if (xw.includes('大温')) props['温'] = 7;
  else if (xw.includes('温')) props['温'] = xw.includes('微温') ? 3 : 5;
  if (xw.includes('凉')) props['凉'] = 4;
  if (xw.includes('平')) props['平'] = 3;
  
  if (!Object.values(props).some(v => v > 0)) props['平'] = 3;
  
  const fArr = Object.entries(flavors).filter(([,v]) => v>0).map(([k,v]) => ({name:k, max:5, value:v}));
  const pArr = Object.entries(props).filter(([,v]) => v>0).map(([k,v]) => ({name:k, max:8, value:v}));
  
  if (!fArr.length && !pArr.length) {
    chart.setOption({title:{text:'暂无性味数据', left:'center', top:'center', textStyle:{fontSize:13,color:'#8b7355'}}});
    return;
  }
  
  chart.setOption({
    title: {text: herb.药名 + '·性味', left:'center', textStyle:{fontSize:13,color:'#5a2d0c'}},
    tooltip: {},
    radar: [
      {indicator: fArr, center:['25%','55%'], radius:'50%', name:{textStyle:{color:'#5a2d0c',fontSize:11}}},
      {indicator: pArr, center:['75%','55%'], radius:'50%', name:{textStyle:{color:'#5a2d0c',fontSize:11}}}
    ],
    series: [
      {type:'radar', data:[{value:fArr.map(f=>f.value), areaStyle:{color:'rgba(139,69,19,0.2)'}, lineStyle:{color:'#8b4513',width:2}, itemStyle:{color:'#8b4513'}}]},
      {type:'radar', radarIndex:1, data:[{value:pArr.map(p=>p.value), areaStyle:{color:'rgba(196,163,90,0.2)'}, lineStyle:{color:'#c4a35a',width:2}, itemStyle:{color:'#c4a35a'}}]}
    ]
  }, true);
  
  window.addEventListener('resize', () => chart.resize());
}
