// ========== Vue 3 应用 ==========
const {createApp, ref, computed, watch, onMounted, nextTick} = Vue;

createApp({
  setup() {
    const herbs = ref(window.__HERBS__ || []);
    const searchQuery = ref('');
    const activeCategory = ref('');
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
      return ['全部', ...Array.from(cats)];
    });
    
    const categoryCounts = computed(() => {
      const counts = {};
      herbs.value.forEach(h => { counts[h.分类] = (counts[h.分类] || 0) + 1; });
      return counts;
    });
    
    const filteredHerbs = computed(() => {
      let list = herbs.value;
      const q = searchQuery.value.trim().toLowerCase();
      const cat = activeCategory.value;
      if (cat && cat !== '全部') list = list.filter(h => h.分类 === cat);
      if (q) {
        list = list.filter(h => {
          return (h.药名 && h.药名.includes(q)) ||
                 (h.功效 && h.功效.toLowerCase().includes(q)) ||
                 (h.主治 && h.主治.toLowerCase().includes(q)) ||
                 (h.归经 && h.归经.includes(q)) ||
                 (h.性味 && h.性味.includes(q));
        });
      }
      return list;
    });
    
    const statsText = computed(() => {
      const total = herbs.value.length;
      const filtered = filteredHerbs.value.length;
      if (filtered === total && !searchQuery.value && (!activeCategory.value || activeCategory.value === '全部')) {
        return `共收录 ${total} 味中药`;
      }
      let text = `找到 ${filtered} 味`;
      if (searchQuery.value) text += `（"${searchQuery.value}"）`;
      if (activeCategory.value && activeCategory.value !== '全部') text += `（${activeCategory.value}）`;
      return text;
    });
    
    const herbNameList = computed(() => herbs.value.map(h => h.药名));
    
    function search() { showWelcome.value = false; }
    function selectCategory(cat) { activeCategory.value = cat === '全部' ? '' : cat; showWelcome.value = false; }
    
    function toggleExpand(herb) {
      if (expandedHerb.value && expandedHerb.value.药名 === herb.药名) {
        expandedHerb.value = null; selectedHerb.value = null;
        nextTick(() => renderFlavorChart(null));
      } else {
        expandedHerb.value = herb; selectedHerb.value = herb;
        nextTick(() => renderFlavorChart(herb));
      }
    }
    
    function toggleFavorite(herb) {
      const idx = favorites.value.findIndex(f => f.药名 === herb.药名);
      if (idx > -1) favorites.value.splice(idx, 1);
      else favorites.value.push({药名: herb.药名, 分类: herb.分类});
    }
    function isFavorite(herb) { return favorites.value.some(f => f.药名 === herb.药名); }
    
    function toggleCompare(herb) {
      const idx = compareList.value.findIndex(c => c.药名 === herb.药名);
      if (idx > -1) compareList.value.splice(idx, 1);
      else if (compareList.value.length < 4) compareList.value.push(herb);
    }
    function isComparing(herb) { return compareList.value.some(c => c.药名 === herb.药名); }
    function clearCompare() { compareList.value = []; }
    
    function quickQuery(name) { searchQuery.value = name; showWelcome.value = false; }
    function selectFavorite(herbName) { searchQuery.value = herbName; showWelcome.value = false; }
    function removeFavorite(name) { favorites.value = favorites.value.filter(f => f.药名 !== name); }
    
    const compareFields = ['药名', '分类', '性味', '归经', '功效', '主治', '剂量', '禁忌', '用法'];
    
    function updateMeridianChart() {
      nextTick(() => { renderMeridianChart(herbs.value, filteredHerbs.value); });
    }
    watch(filteredHerbs, () => { updateMeridianChart(); }, {deep: false});
    
    onMounted(() => {
      nextTick(() => {
        loading.value = false;
        renderMeridianChart(herbs.value);
        renderFlavorChart(null);
        // 延迟重绘确保布局稳定
        setTimeout(() => {
          renderMeridianChart(herbs.value, filteredHerbs.value);
        }, 500);
      });
    });
    
    return {
      herbs, searchQuery, activeCategory, compareList, expandedHerb, selectedHerb,
      showWelcome, loading, favorites, categories, categoryCounts, filteredHerbs,
      statsText, herbNameList, compareFields, showCharts,
      search, selectCategory, toggleExpand, toggleFavorite, isFavorite,
      toggleCompare, isComparing, clearCompare, quickQuery, selectFavorite, removeFavorite
    };
  },
  template: `
    <div>
      <!-- 搜索区 -->
      <div class="search-area">
        <div class="search-row">
          <div class="search-input-wrap">
            <span class="icon">🔍</span>
            <input v-model="searchQuery" @input="search" placeholder="输入药名、功效、归经、性味…" autofocus/>
          </div>
          <button class="btn btn-primary" @click="search">查询</button>
        </div>
        <div class="filter-bar">
          <span v-for="cat in categories" :key="cat"
                class="tag" :class="{active: activeCategory === cat || (cat==='全部' && !activeCategory)}"
                @click="selectCategory(cat)">
            {{ cat }}<span class="count" v-if="cat!=='全部'">({{categoryCounts[cat]||0}})</span>
          </span>
        </div>
        <div class="stats-bar" v-if="!showWelcome">
          <span><span class="highlight">{{filteredHerbs.length}}</span> / {{herbs.length}} 味</span>
          <span>{{statsText}}</span>
        </div>
      </div>

      <!-- 对比面板 -->
      <div class="compare-panel" v-if="compareList.length >= 2">
        <div class="compare-header">
          <h3>📊 对比模式（{{compareList.length}}味）</h3>
          <button class="btn btn-sm btn-danger" @click="clearCompare">清除对比</button>
        </div>
        <div class="compare-body">
          <table class="compare-table">
            <tr><th>字段</th><th v-for="h in compareList" :key="h.药名">{{h.药名}}</th></tr>
            <tr v-for="field in compareFields.slice(1)" :key="field">
              <td>{{field}}</td>
              <td v-for="h in compareList" :key="h.药名+field">{{h[field] || '—'}}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- 快速定位 -->
      <div class="quick-nav" v-if="!showWelcome && filteredHerbs.length > 0">
        <div class="quick-nav-title">📌 快速定位</div>
        <div class="quick-nav-items">
          <span class="quick-nav-item" v-for="name in herbNameList" :key="name" @click="quickQuery(name)">{{name}}</span>
        </div>
      </div>

      <!-- 双栏布局 -->
      <div class="main-layout">
        <!-- 主内容区 -->
        <div class="main-content">
          <!-- 欢迎页 -->
          <div class="welcome-area" v-if="showWelcome && !searchQuery && !activeCategory">
            <div class="icon">🌿</div>
            <h2>中药交互模型</h2>
            <p>输入药名开始查询 · 支持按功效、归经、性味搜索 · 收录 {{herbs.length}} 味中药</p>
          </div>

          <div class="no-result" v-if="!showWelcome && filteredHerbs.length === 0">
            <div class="icon">🔍</div>
            <p>未找到匹配的中药</p>
            <p class="suggestion">试试输入药名中的任意字，或按分类浏览</p>
          </div>

          <!-- 药材卡片 -->
          <div v-for="herb in filteredHerbs" :key="herb.药名" class="herb-card"
               :class="{expanded: expandedHerb && expandedHerb.药名 === herb.药名}"
               @click="toggleExpand(herb)">
            <div class="herb-card-header" @click.stop>
              <div class="herb-name-row">
                <span class="herb-name">{{herb.药名}}</span>
                <span class="herb-category-badge">{{herb.分类}}</span>
              </div>
              <div class="herb-card-actions">
                <button class="compare-btn" :class="{selected: isComparing(herb)}"
                        @click.stop="toggleCompare(herb)">
                  {{isComparing(herb) ? '✅' : '📊'}}
                </button>
                <button class="fav-btn" :class="{active: isFavorite(herb)}"
                        @click.stop="toggleFavorite(herb)">
                  {{isFavorite(herb) ? '❤️' : '🤍'}}
                </button>
              </div>
            </div>
            <div class="herb-summary">
              <span><span class="label">性味</span><span class="value">{{herb.性味}}</span></span>
              <span><span class="label">归经</span><span class="value">{{herb.归经}}</span></span>
            </div>
            <div class="herb-summary" style="margin-top:4px">
              <span><span class="label">功效</span><span class="value">{{herb.功效}}</span></span>
            </div>
            <div class="herb-detail" v-if="expandedHerb && expandedHerb.药名 === herb.药名">
              <div class="detail-grid">
                <div class="detail-field"><div class="detail-field-label">📖 主治</div><div class="detail-field-value">{{herb.主治}}</div></div>
                <div class="detail-field" v-if="herb.剂量"><div class="detail-field-label">⚖️ 剂量</div><div class="detail-field-value">{{herb.剂量}}</div></div>
                <div class="detail-field" v-if="herb.用法"><div class="detail-field-label">💊 用法</div><div class="detail-field-value">{{herb.用法}}</div></div>
                <div class="detail-field" v-if="herb.禁忌"><div class="detail-field-label">⚠️ 禁忌</div><div class="detail-field-value">{{herb.禁忌}}</div></div>
                <div class="detail-field full-width" v-if="herb.配伍"><div class="detail-field-label">🤝 配伍</div><div class="detail-field-value">{{herb.配伍}}</div></div>
                <div class="detail-field full-width" v-if="herb.注意"><div class="detail-field-label">📝 注意</div><div class="detail-field-value">{{herb.注意}}</div></div>
              </div>
            </div>
          </div>

          <!-- ======== 图表区（放主内容下方，更宽） ======== -->
          <div class="charts-area" v-if="filteredHerbs.length > 0">
            <div class="charts-toggle" @click="showCharts = !showCharts">
              <span>{{ showCharts ? '📈 收起可视化' : '📈 展开可视化' }}</span>
            </div>
            <div v-show="showCharts" class="charts-grid">
              <!-- 归经桑基图 -->
              <div class="chart-card">
                <div class="chart-card-header">🧍 归经关系图</div>
                <div class="chart-card-body">
                  <div id="meridianChart" style="width:100%;height:420px;"></div>
                </div>
              </div>
              <!-- 性味雷达图 -->
              <div class="chart-card" v-if="selectedHerb">
                <div class="chart-card-header">🌡️ {{selectedHerb.药名}} · 性味分析</div>
                <div class="chart-card-body">
                  <div id="flavorChart" style="width:100%;height:420px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 侧栏：收藏夹 -->
        <div class="sidebar">
          <div class="favorites-panel">
            <div class="fav-panel-header">
              <h3>❤️ 收藏夹</h3>
              <span class="fav-count">{{favorites.length}} 味</span>
            </div>
            <div class="fav-list">
              <div v-if="favorites.length === 0" class="fav-empty">点击卡片上的 🤍 收藏中药</div>
              <div v-for="fav in favorites" :key="fav.药名" class="fav-item" @click="selectFavorite(fav.药名)">
                <div>
                  <div class="fav-item-name">{{fav.药名}}</div>
                  <div class="fav-item-cat">{{fav.分类}}</div>
                </div>
                <button class="fav-remove" @click.stop="removeFavorite(fav.药名)">✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 智能体预留 -->
      <button class="ai-agent-fab" title="AI 智能助手（即将上线）">🤖</button>
    </div>
  `
}).mount('#app');

