const {createApp, ref, computed, watch, onMounted, nextTick} = Vue;
const ALL_MERIDIANS=['肝经','胆经','心经','小肠经','脾经','胃经','肺经','大肠经','肾经','膀胱经','心包经','三焦经'];
const ALL_FLAVORS=[{g:'五味',items:['辛','甘','酸','苦','咸','淡','涩']},{g:'四气',items:['寒','热','温','凉','平']}];
const PAGE_SIZE=25;

createApp({
  setup(){
    const herbs=ref(window.__HERBS__||[]);
    const searchQuery=ref('');
    const activeCategories=ref([]);
    const activeMeridians=ref([]);
    const activeFlavors=ref([]);
    const compareList=ref([]);
    const expandedHerb=ref(null);
    const selectedHerb=ref(null);
    const showWelcome=ref(true);
    const loading=ref(true);
    const showCharts=ref(false);
    const displayCount=ref(PAGE_SIZE); // 显示条数
    
    const favorites=ref(JSON.parse(localStorage.getItem('herb_favorites')||'[]'));
    watch(favorites,(v)=>{localStorage.setItem('herb_favorites',JSON.stringify(v))},{deep:true});
    
    const categories=computed(()=>{const s=new Set();herbs.value.forEach(h=>{if(h.分类)s.add(h.分类)});return Array.from(s)});
    const categoryCounts=computed(()=>{const c={};herbs.value.forEach(h=>{c[h.分类]=(c[h.分类]||0)+1});return c});
    
    const filteredHerbs=computed(()=>{
      let l=herbs.value;
      const q=searchQuery.value.trim().toLowerCase(),cats=activeCategories.value,mids=activeMeridians.value,favs=activeFlavors.value;
      if(cats.length)l=l.filter(h=>cats.includes(h.分类));
      if(mids.length)l=l.filter(h=>h.归经&&mids.some(m=>h.归经.includes(m.replace('经',''))));
      if(favs.length)l=l.filter(h=>h.性味&&favs.some(f=>h.性味.includes(f)));
      if(q)l=l.filter(h=>(h.药名&&h.药名.includes(q))||(h.功效&&h.功效.toLowerCase().includes(q))||(h.主治&&h.主治.toLowerCase().includes(q)));
      return l;
    });
    
    const hasFilters=computed(()=>searchQuery.value||activeCategories.value.length||activeMeridians.value.length||activeFlavors.value.length);
    const statsText=computed(()=>{
      const p=[];const f=filteredHerbs.value.length,t=herbs.value.length;
      if(activeCategories.value.length)p.push(activeCategories.value.join('+'));
      if(activeMeridians.value.length)p.push(activeMeridians.value.join('+'));
      if(activeFlavors.value.length)p.push(activeFlavors.value.join('+'));
      if(searchQuery.value)p.push('"'+searchQuery.value+'"');
      if(!p.length)return '共收录 '+t+' 味中药';
      return '找到 '+f+'/'+t+' 味（'+p.join('+')+'）';
    });
    
    // 分页
    const pagedHerbs=computed(()=>filteredHerbs.value.slice(0,displayCount.value));
    const hasMore=computed(()=>displayCount.value<filteredHerbs.value.length);
    const totalFiltered=computed(()=>filteredHerbs.value.length);
    function loadMore(){displayCount.value=Math.min(displayCount.value+PAGE_SIZE,totalFiltered.value)}
    
    // 搜索防抖
    let searchTimer=null;
    function onSearchInput(){
      showWelcome.value=false;
      displayCount.value=PAGE_SIZE;
      if(searchTimer)clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>{},200);
    }
    
    function toggleCategory(cat){const i=activeCategories.value.indexOf(cat);i>-1?activeCategories.value.splice(i,1):activeCategories.value.push(cat);activeCategories.value=[...activeCategories.value];showWelcome.value=false;displayCount.value=PAGE_SIZE}
    function toggleMeridian(m){const i=activeMeridians.value.indexOf(m);i>-1?activeMeridians.value.splice(i,1):activeMeridians.value.push(m);activeMeridians.value=[...activeMeridians.value];showWelcome.value=false;displayCount.value=PAGE_SIZE}
    function toggleFlavor(f){const i=activeFlavors.value.indexOf(f);i>-1?activeFlavors.value.splice(i,1):activeFlavors.value.push(f);activeFlavors.value=[...activeFlavors.value];showWelcome.value=false;displayCount.value=PAGE_SIZE}
    function clearAllFilters(){searchQuery.value='';activeCategories.value=[];activeMeridians.value=[];activeFlavors.value=[];displayCount.value=PAGE_SIZE}
    
    function toggleExpand(herb){
      if(expandedHerb.value&&expandedHerb.value.药名===herb.药名){expandedHerb.value=null;selectedHerb.value=null;nextTick(()=>renderFlavorChart(null))}
      else{expandedHerb.value=herb;selectedHerb.value=herb;nextTick(()=>renderFlavorChart(herb));setTimeout(()=>{const el=document.getElementById('h-'+herb.药名);if(el)el.scrollIntoView({behavior:'smooth',block:'center'})},100)}
    }
    function toggleFavorite(herb){const i=favorites.value.findIndex(f=>f.药名===herb.药名);i>-1?favorites.value.splice(i,1):favorites.value.push({药名:herb.药名,分类:herb.分类})}
    function isFavorite(herb){return favorites.value.some(f=>f.药名===herb.药名)}
    function toggleCompare(herb){const i=compareList.value.findIndex(c=>c.药名===herb.药名);i>-1?compareList.value.splice(i,1):compareList.value.length<4&&compareList.value.push(herb)}
    function isComparing(herb){return compareList.value.some(c=>c.药名===herb.药名)}
    function clearCompare(){compareList.value=[]}
    function quickQuery(n){searchQuery.value=n;showWelcome.value=false;displayCount.value=PAGE_SIZE}
    function selectFavorite(n){searchQuery.value=n;showWelcome.value=false;displayCount.value=PAGE_SIZE}
    function removeFavorite(n){favorites.value=favorites.value.filter(f=>f.药名!==n)}
    const compareFields=['药名','分类','性味','归经','功效','主治','剂量','禁忌','用法'];
    
    onMounted(()=>{
      window.__onMeridianClick=(jing)=>{
        const m=jing+'经';const i=activeMeridians.value.indexOf(m);
        i>-1?activeMeridians.value.splice(i,1):activeMeridians.value.push(m);
        activeMeridians.value=[...activeMeridians.value];showWelcome.value=false;displayCount.value=PAGE_SIZE
      };
      nextTick(()=>{loading.value=false;renderMeridianChart(herbs.value);renderFlavorChart(null);setTimeout(()=>renderMeridianChart(herbs.value,filteredHerbs.value),500)})
    });
    watch(filteredHerbs,()=>nextTick(()=>renderMeridianChart(herbs.value,filteredHerbs.value)),{deep:false});
    
    return{
      herbs,searchQuery,activeCategories,activeMeridians,activeFlavors,ALL_MERIDIANS,ALL_FLAVORS,
      compareList,expandedHerb,selectedHerb,showWelcome,loading,favorites,categories,categoryCounts,
      filteredHerbs,statsText,compareFields,showCharts,hasFilters,
      pagedHerbs,hasMore,totalFiltered,displayCount,loadMore,onSearchInput,
      toggleCategory,toggleMeridian,toggleFlavor,clearAllFilters,
      toggleExpand,toggleFavorite,isFavorite,toggleCompare,isComparing,
      clearCompare,quickQuery,selectFavorite,removeFavorite
    };
  },
  template:`<div>
<div class="search-area">
<div class="search-row"><div class="search-input-wrap"><span class="icon">🔍</span><input v-model="searchQuery" @input="onSearchInput" placeholder="药名、功效、主治…" autofocus/></div><button class="btn btn-primary" @click="onSearchInput">查询</button></div>
<div class="filter-bar">
<span class="tag" :class="{active:!activeCategories.length}" @click="clearAllFilters" style="font-size:11px">全部</span>
<span v-for="cat in categories" :key="cat" class="tag" :class="{active:activeCategories.includes(cat)}" @click="toggleCategory(cat)">{{cat}}<span class="count">({{categoryCounts[cat]||0}})</span></span>
</div>
<div class="filter-bar"><span v-for="m in ALL_MERIDIANS" :key="m" class="tag" :class="{active:activeMeridians.includes(m)}" @click="toggleMeridian(m)">{{m}}</span></div>
<div class="filter-bar" v-for="fg in ALL_FLAVORS" :key="fg.g"><span v-for="f in fg.items" :key="f" class="tag" :class="{active:activeFlavors.includes(f)}" @click="toggleFlavor(f)">{{f}}</span></div>
<div class="stats-bar" v-if="hasFilters">
<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span><span class="highlight">{{totalFiltered}}</span>/{{herbs.length}}</span><span style="color:#8b7355;font-size:12px">{{statsText}}</span>
<span v-for="c in activeCategories" :key="c" class="filter-chip">{{c}}<button class="rm" @click="activeCategories=activeCategories.filter(x=>x!==c)">✕</button></span>
<span v-for="m in activeMeridians" :key="m" class="filter-chip">{{m}}<button class="rm" @click="activeMeridians=activeMeridians.filter(x=>x!==m)">✕</button></span>
<span v-for="f in activeFlavors" :key="f" class="filter-chip">{{f}}<button class="rm" @click="activeFlavors=activeFlavors.filter(x=>x!==f)">✕</button></span>
</div><button v-if="hasFilters" class="btn btn-xs btn-outline" @click="clearAllFilters">清除</button></div></div>
<div class="compare-panel" v-if="compareList.length>=2"><div class="compare-header"><h3>📊 对比（{{compareList.length}}味）</h3><button class="btn btn-sm btn-danger" @click="clearCompare">清除</button></div>
<div class="compare-body"><table class="compare-table"><tr><th>字段</th><th v-for="h in compareList" :key="h.药名">{{h.药名}}</th></tr>
<tr v-for="f in compareFields.slice(1)" :key="f"><td>{{f}}</td><td v-for="h in compareList" :key="h.药名+f">{{h[f]||'—'}}</td></tr></table></div></div>
<div class="quick-nav" v-if="hasFilters&&totalFiltered>0"><div class="quick-nav-title">📌 定位</div><div class="quick-nav-items"><span class="quick-nav-item" v-for="name in herbs.map(h=>h.药名)" :key="name" @click="quickQuery(name)">{{name}}</span></div></div>
<div class="main-layout"><div class="main-content">
<div class="welcome-area" v-if="!hasFilters"><div class="icon">🌿</div><h2>中药交互模型</h2><p>{{herbs.length}}味中药 · 分类+归经+性味交叉筛选 · 展开图表看分布</p></div>
<div class="no-result" v-if="hasFilters&&!totalFiltered"><div class="icon">🔍</div><p>无匹配结果</p><button class="btn btn-sm btn-outline" style="margin-top:12px" @click="clearAllFilters">清除筛选</button></div>
<div v-for="herb in pagedHerbs" :key="herb.药名" class="herb-card" :class="{expanded:expandedHerb&&expandedHerb.药名===herb.药名}" @click="toggleExpand(herb)" :id="'h-'+herb.药名">
<div class="herb-card-header" @click.stop><div class="herb-name-row"><span class="herb-name">{{herb.药名}}</span><span class="herb-category-badge">{{herb.分类}}</span></div>
<div class="herb-card-actions"><button class="compare-btn" :class="{selected:isComparing(herb)}" @click.stop="toggleCompare(herb)">{{isComparing(herb)?'✅':'📊'}}</button><button class="fav-btn" :class="{active:isFavorite(herb)}" @click.stop="toggleFavorite(herb)">{{isFavorite(herb)?'❤️':'🤍'}}</button></div></div>
<div class="herb-summary"><span><span class="label">性味</span><span class="value">{{herb.性味}}</span></span><span><span class="label">归经</span><span class="value">{{herb.归经}}</span></span></div>
<div class="herb-summary" style="margin-top:4px"><span><span class="label">功效</span><span class="value">{{herb.功效}}</span></span></div>
<div class="herb-detail" v-if="expandedHerb&&expandedHerb.药名===herb.药名"><div class="detail-grid">
<div class="detail-field"><div class="detail-field-label">📖 主治</div><div class="detail-field-value">{{herb.主治}}</div></div>
<div class="detail-field" v-if="herb.剂量"><div class="detail-field-label">⚖️</div><div class="detail-field-value">{{herb.剂量}}</div></div>
<div class="detail-field" v-if="herb.用法"><div class="detail-field-label">💊</div><div class="detail-field-value">{{herb.用法}}</div></div>
<div class="detail-field" v-if="herb.禁忌"><div class="detail-field-label">⚠️</div><div class="detail-field-value">{{herb.禁忌}}</div></div>
<div class="detail-field full-width" v-if="herb.配伍"><div class="detail-field-label">🤝 配伍</div><div class="detail-field-value">{{herb.配伍}}</div></div>
<div class="detail-field full-width" v-if="herb.注意"><div class="detail-field-label">📝 注意</div><div class="detail-field-value">{{herb.注意}}</div></div>
</div></div></div>
<div class="load-more-wrap" v-if="hasMore"><button class="load-more-btn" @click="loadMore">加载更多（{{displayCount}}/{{totalFiltered}}）</button></div>
<div class="charts-area" v-if="!hasFilters||totalFiltered"><div class="charts-toggle" @click="showCharts=!showCharts"><span>{{showCharts?'📈 收起':'📈 展开'}}可视化</span></div>
<div v-show="showCharts" class="charts-stack">
<div class="chart-card"><div class="chart-card-header">🧍 归经分布 <span style="font-size:12px;font-weight:400;color:#8b7355">（点击条形图切换筛选）</span></div><div class="chart-card-body"><div id="meridianChart" style="width:100%;height:500px"></div></div></div>
<div class="chart-card" v-if="selectedHerb"><div class="chart-card-header">🌡️ {{selectedHerb.药名}} · 四气五味</div><div class="chart-card-body"><div id="flavorChart" style="width:100%;height:540px"></div></div></div>
</div></div></div>
<div class="sidebar"><div class="favorites-panel"><div class="fav-panel-header"><h3>❤️ 收藏</h3><span class="fav-count">{{favorites.length}}</span></div>
<div class="fav-list"><div v-if="!favorites.length" class="fav-empty">点 🤍 收藏</div>
<div v-for="fav in favorites" :key="fav.药名" class="fav-item" @click="selectFavorite(fav.药名)"><div><div class="fav-item-name">{{fav.药名}}</div><div class="fav-item-cat">{{fav.分类}}</div></div><button class="fav-remove" @click.stop="removeFavorite(fav.药名)">✕</button></div></div></div></div></div>
<button class="ai-agent-fab">🤖</button></div>`
}).mount('#app');
