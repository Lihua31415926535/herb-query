const {createApp, ref, computed, watch, onMounted, nextTick} = Vue;

createApp({
  setup() {
    const herbs = ref(window.__HERBS__ || []);
    const searchQuery = ref('');
    const activeCategories = ref([]); // 改为数组，支持多选
    const meridianFilter = ref('');
    const compareList = ref([]);
    const expandedHerb = ref(null);
    const selectedHerb = ref(null);
    const showWelcome = ref(true);
    const loading = ref(true);
    const showCharts = ref(true);
    
    const favorites = ref(JSON.parse(localStorage.getItem('herb_favorites') || '[]'));
    watch(favorites, (v) => { localStorage.setItem('herb_favorites', JSON.stringify(v)); }, {deep: true});
    
    const categories = computed(() => {
      const cats = new Set();
      herbs.value.forEach(h => { if (h.分类) cats.add(h.分类); });
      return Array.from(cats);
    });
    const categoryCounts = computed(() => {
      const counts = {};
      herbs.value.forEach(h => { counts[h.分类] = (counts[h.分类] || 0) + 1; });
      return counts;
    });
    
    const filteredHerbs = computed(() => {
      let list = herbs.value;
      const q = searchQuery.value.trim().toLowerCase();
      const cats = activeCategories.value;
      const mf = meridianFilter.value;
      
      if (cats.length > 0) list = list.filter(h => cats.includes(h.分类));
      if (mf) list = list.filter(h => h.归经 && h.归经.includes(mf));
      if (q) list = list.filter(h => 
        (h.药名 && h.药名.includes(q)) || 
        (h.功效 && h.功效.toLowerCase().includes(q)) || 
        (h.主治 && h.主治.toLowerCase().includes(q)) || 
        (h.归经 && h.归经.includes(q)) || 
        (h.性味 && h.性味.includes(q))
      );
      return list;
    });
    
    const statsText = computed(() => {
      const t = herbs.value.length, f = filteredHerbs.value.length;
      const parts = [];
      if (meridianFilter.value) parts.push('归' + meridianFilter.value + '经');
      if (searchQuery.value) parts.push('"' + searchQuery.value + '"');
      if (activeCategories.value.length > 0) parts.push(activeCategories.value.join('+'));
      const suffix = parts.length ? '（' + parts.join(' + ') + '）' : '';
      if (f === t && !suffix) return '共收录 ' + t + ' 味中药';
      return '找到 ' + f + ' / ' + t + ' 味' + suffix;
    });
    
    const herbNameList = computed(() => herbs.value.map(h => h.药名));
    
    function search() { showWelcome.value = false; }
    
    // 多选分类：切换
    function toggleCategory(cat) {
      const idx = activeCategories.value.indexOf(cat);
      if (idx > -1) {
        activeCategories.value.splice(idx, 1);
      } else {
        activeCategories.value.push(cat);
      }
      // 触发响应式更新
      activeCategories.value = [...activeCategories.value];
      showWelcome.value = false;
    }
    
    function filterByMeridian(jing) {
      meridianFilter.value = jing;
      searchQuery.value = '';
      activeCategories.value = [];
      showWelcome.value = false;
    }
    function clearMeridianFilter() { meridianFilter.value = ''; }
    
    function toggleExpand(herb) {
      if (expandedHerb.value && expandedHerb.value.药名===herb.药名) { 
        expandedHerb.value=null; selectedHerb.value=null; 
        nextTick(()=>renderFlavorChart(null)); 
      } else { 
        expandedHerb.value=herb; selectedHerb.value=herb; 
        nextTick(()=>renderFlavorChart(herb));
        setTimeout(() => {
          const el = document.getElementById('herb-'+herb.药名);
          if (el) el.scrollIntoView({behavior:'smooth', block:'center'});
        }, 100);
      }
    }
    
    function toggleFavorite(herb) {
      const i=favorites.value.findIndex(f=>f.药名===herb.药名);
      i>-1 ? favorites.value.splice(i,1) : favorites.value.push({药名:herb.药名,分类:herb.分类});
    }
    function isFavorite(herb) { return favorites.value.some(f=>f.药名===herb.药名); }
    function toggleCompare(herb) {
      const i=compareList.value.findIndex(c=>c.药名===herb.药名);
      i>-1 ? compareList.value.splice(i,1) : compareList.value.length<4 && compareList.value.push(herb);
    }
    function isComparing(herb) { return compareList.value.some(c=>c.药名===herb.药名); }
    function clearCompare() { compareList.value=[]; }
    function quickQuery(n) { searchQuery.value=n; showWelcome.value=false; meridianFilter.value=''; activeCategories.value=[]; }
    function selectFavorite(n) { searchQuery.value=n; showWelcome.value=false; meridianFilter.value=''; activeCategories.value=[]; }
    function removeFavorite(n) { favorites.value=favorites.value.filter(f=>f.药名!==n); }
    function clearAllFilters() { searchQuery.value=''; activeCategories.value=[]; meridianFilter.value=''; }
    
    const compareFields = ['药名','分类','性味','归经','功效','主治','剂量','禁忌','用法'];
    const meridianHerbCount = computed(() => {
      if (!meridianFilter.value) return 0;
      return herbs.value.filter(h => h.归经 && h.归经.includes(meridianFilter.value)).length;
    });
    
    // 是否有激活的筛选条件
    const hasFilters = computed(() => 
      searchQuery.value || activeCategories.value.length > 0 || meridianFilter.value
    );
    
    watch(filteredHerbs, ()=>nextTick(()=>renderMeridianChart(herbs.value,filteredHerbs.value)), {deep:false});
    
    onMounted(()=>{
      window.__onMeridianClick = (jing) => { filterByMeridian(jing); };
      nextTick(()=>{
        loading.value=false;
        renderMeridianChart(herbs.value);
        renderFlavorChart(null);
        setTimeout(()=>renderMeridianChart(herbs.value,filteredHerbs.value),500);
      });
    });
    
    return {
      herbs,searchQuery,activeCategories,meridianFilter,compareList,expandedHerb,selectedHerb,
      showWelcome,loading,favorites,categories,categoryCounts,filteredHerbs,
      statsText,herbNameList,compareFields,showCharts,hasFilters,
      search,toggleCategory,filterByMeridian,clearMeridianFilter,
      toggleExpand,toggleFavorite,isFavorite,toggleCompare,isComparing,
      clearCompare,quickQuery,selectFavorite,removeFavorite,clearAllFilters
    };
  },
  template: `<div>
<div class="search-area">
<div class="search-row"><div class="search-input-wrap"><span class="icon">🔍</span><input v-model="searchQuery" @input="search" placeholder="输入药名、功效、归经、性味…" autofocus/></div><button class="btn btn-primary" @click="search">查询</button></div>
<div class="filter-bar">
<span class="tag" :class="{active:activeCategories.length===0}" @click="activeCategories=[];showWelcome=false">全部</span>
<span v-for="cat in categories" :key="cat" class="tag" :class="{active:activeCategories.includes(cat)}" @click="toggleCategory(cat)">{{cat}}<span class="count">({{categoryCounts[cat]||0}})</span></span>
</div>
<div class="stats-bar" v-if="!showWelcome||hasFilters">
<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
<span><span class="highlight">{{filteredHerbs.length}}</span>/{{herbs.length}}味</span>
<span v-if="hasFilters" style="color:#8b7355">{{statsText}}</span>
<div style="display:flex;gap:4px;flex-wrap:wrap">
<span v-if="meridianFilter" class="tag active" style="cursor:default;display:inline-flex;align-items:center;gap:2px;font-size:12px;padding:2px 10px">归{{meridianFilter}}经<button @click="clearMeridianFilter" style="background:none;border:none;color:white;cursor:pointer;font-size:12px;padding:0;margin-left:2px;line-height:1">✕</button></span>
<span v-for="cat in activeCategories" :key="cat" class="tag active" style="cursor:default;display:inline-flex;align-items:center;gap:2px;font-size:12px;padding:2px 10px">{{cat}}<button @click="activeCategories=activeCategories.filter(c=>c!==cat)" style="background:none;border:none;color:white;cursor:pointer;font-size:12px;padding:0;margin-left:2px;line-height:1">✕</button></span>
</div>
</div>
<button v-if="hasFilters" class="btn btn-xs btn-outline" @click="clearAllFilters" style="padding:2px 10px">清除全部</button>
</div>
</div>
<div class="compare-panel" v-if="compareList.length>=2"><div class="compare-header"><h3>📊 对比模式（{{compareList.length}}味）</h3><button class="btn btn-sm btn-danger" @click="clearCompare">清除</button></div>
<div class="compare-body"><table class="compare-table"><tr><th>字段</th><th v-for="h in compareList" :key="h.药名">{{h.药名}}</th></tr>
<tr v-for="f in compareFields.slice(1)" :key="f"><td>{{f}}</td><td v-for="h in compareList" :key="h.药名+f">{{h[f]||'—'}}</td></tr></table></div></div>
<div class="quick-nav" v-if="hasFilters&&filteredHerbs.length>0"><div class="quick-nav-title">📌 快速定位</div><div class="quick-nav-items"><span class="quick-nav-item" v-for="name in herbNameList" :key="name" @click="quickQuery(name)">{{name}}</span></div></div>
<div class="main-layout"><div class="main-content">
<div class="welcome-area" v-if="!hasFilters&&filteredHerbs.length===herbs.length"><div class="icon">🌿</div><h2>中药交互模型</h2><p>录入 {{herbs.length}} 味中药 · 支持多分类筛选 · 点击归经图表可筛选药材</p></div>
<div class="no-result" v-if="hasFilters&&filteredHerbs.length===0"><div class="icon">🔍</div><p>未找到匹配的中药</p><p class="suggestion">试试其他关键词或减少筛选条件</p><button class="btn btn-sm btn-outline" style="margin-top:12px" @click="clearAllFilters">清除所有筛选</button></div>
<div v-for="herb in filteredHerbs" :key="herb.药名" class="herb-card" :class="{expanded:expandedHerb&&expandedHerb.药名===herb.药名}" @click="toggleExpand(herb)" :id="'herb-'+herb.药名">
<div class="herb-card-header" @click.stop><div class="herb-name-row"><span class="herb-name">{{herb.药名}}</span><span class="herb-category-badge">{{herb.分类}}</span></div>
<div class="herb-card-actions"><button class="compare-btn" :class="{selected:isComparing(herb)}" @click.stop="toggleCompare(herb)">{{isComparing(herb)?'✅':'📊'}}</button><button class="fav-btn" :class="{active:isFavorite(herb)}" @click.stop="toggleFavorite(herb)">{{isFavorite(herb)?'❤️':'🤍'}}</button></div></div>
<div class="herb-summary"><span><span class="label">性味</span><span class="value">{{herb.性味}}</span></span><span><span class="label">归经</span><span class="value">{{herb.归经}}</span></span></div>
<div class="herb-summary" style="margin-top:4px"><span><span class="label">功效</span><span class="value">{{herb.功效}}</span></span></div>
<div class="herb-detail" v-if="expandedHerb&&expandedHerb.药名===herb.药名"><div class="detail-grid">
<div class="detail-field"><div class="detail-field-label">📖 主治</div><div class="detail-field-value">{{herb.主治}}</div></div>
<div class="detail-field" v-if="herb.剂量"><div class="detail-field-label">⚖️ 剂量</div><div class="detail-field-value">{{herb.剂量}}</div></div>
<div class="detail-field" v-if="herb.用法"><div class="detail-field-label">💊 用法</div><div class="detail-field-value">{{herb.用法}}</div></div>
<div class="detail-field" v-if="herb.禁忌"><div class="detail-field-label">⚠️ 禁忌</div><div class="detail-field-value">{{herb.禁忌}}</div></div>
<div class="detail-field full-width" v-if="herb.配伍"><div class="detail-field-label">🤝 配伍</div><div class="detail-field-value">{{herb.配伍}}</div></div>
<div class="detail-field full-width" v-if="herb.注意"><div class="detail-field-label">📝 注意</div><div class="detail-field-value">{{herb.注意}}</div></div>
</div></div></div>
<div class="charts-area" v-if="filteredHerbs.length>0||!hasFilters">
<div class="charts-toggle" @click="showCharts=!showCharts"><span>{{showCharts?'📈 收起可视化':'📈 展开可视化'}}</span></div>
<div v-show="showCharts" class="charts-stack">
<div class="chart-card"><div class="chart-card-header">🧍 归经分布 <span style="font-size:12px;font-weight:400;color:#8b7355">（点击条形图筛选药材）</span></div><div class="chart-card-body"><div id="meridianChart" style="width:100%;height:520px;"></div></div></div>
<div class="chart-card" v-if="selectedHerb"><div class="chart-card-header">🌡️ {{selectedHerb.药名}} · 四气五味</div><div class="chart-card-body"><div id="flavorChart" style="width:100%;height:560px;"></div></div></div>
</div></div></div>
<div class="sidebar">
<div class="favorites-panel"><div class="fav-panel-header"><h3>❤️ 收藏夹</h3><span class="fav-count">{{favorites.length}}味</span></div>
<div class="fav-list"><div v-if="favorites.length===0" class="fav-empty">点击卡片上的 🤍 收藏中药</div>
<div v-for="fav in favorites" :key="fav.药名" class="fav-item" @click="selectFavorite(fav.药名)"><div><div class="fav-item-name">{{fav.药名}}</div><div class="fav-item-cat">{{fav.分类}}</div></div><button class="fav-remove" @click.stop="removeFavorite(fav.药名)">✕</button></div></div></div>
</div></div>
<button class="ai-agent-fab">🤖</button></div>`
}).mount('#app');
