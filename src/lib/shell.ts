export const SHELL_HTML = `
<div class="app" id="app">
  <div class="topbar">
    <div class="brand">
      <span class="mark">IPPO</span>
      <span class="sub">新発田トラクト配布</span>
    </div>
    <div class="topbar-stat">市全体 <b class="num" id="topPct">0%</b></div>
  </div>

  <main>
    <!-- ================= HOME ================= -->
    <section class="view active" id="view-home">
      <div class="hero" id="heroCard">
        <div class="hero-top">
          <div class="hero-eyebrow">新発田いのちのパンチャーチ ・ 配布プロジェクト</div>
        </div>
        <div class="hero-body">
          <div class="ring-wrap">
            <svg width="112" height="112" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="11"/>
              <circle id="ringFg" cx="56" cy="56" r="48" fill="none" stroke="#F7FBF8" stroke-width="11" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="301.6"/>
            </svg>
            <div class="ring-pct">
              <div class="n num" id="ringPctText">0%</div>
              <div class="s">達成</div>
            </div>
          </div>
          <div class="hero-figures">
            <div class="big num" id="heroCount">0 <small>/ 38,025世帯</small></div>
            <div class="goal">残り <b class="num" id="heroRemain">0</b> 世帯で、新発田市を一巡できます。</div>
          </div>
        </div>
        <div class="hero-credit">📷 新発田城（本庁地区） ・ Drph17, CC BY 4.0, Wikimedia Commons</div>
      </div>

      <div class="card quick-stats-card">
        <button class="qstat" data-nav="ranking">
          <span class="qstat-ic qi-coral">🔥</span>
          <span class="qstat-val num" id="qsStreak">0</span>
          <span class="qstat-lbl">週連続</span>
        </button>
        <button class="qstat" data-nav="ranking">
          <span class="qstat-ic qi-sky">📬</span>
          <span class="qstat-val num" id="qsWeek">0</span>
          <span class="qstat-lbl">今週世帯</span>
        </button>
        <button class="qstat" data-nav="ranking">
          <span class="qstat-ic qi-gold">🏅</span>
          <span class="qstat-val num" id="qsBadges">0</span>
          <span class="qstat-lbl">バッジ</span>
        </button>
        <button class="qstat" data-nav="ranking">
          <span class="qstat-ic qi-purple">🏆</span>
          <span class="qstat-val" id="qsLeader">-</span>
          <span class="qstat-lbl">今週1位</span>
        </button>
      </div>

      <div class="card">
        <div class="card-title"><h3>地区の進み具合</h3><button class="link" data-nav="areas">地図を見る</button></div>
        <div class="mini-map-wrap">
          <div id="miniMapEl" class="leaflet-mini"></div>
        </div>
        <div class="legend" style="margin-top:12px;">
          <span class="sw"><span class="dot" style="background:var(--p-empty);"></span>未着手</span>
          <span class="sw"><span class="dot" style="background:var(--p-mid);"></span>進行中</span>
          <span class="sw"><span class="dot" style="background:var(--p-done);"></span>完了</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>新発田の風景</h3></div>
        <div class="photo-scroll" id="photoScroll"></div>
      </div>

      <div class="card">
        <div class="card-title"><h3>最近の配布記録</h3></div>
        <div id="activityFeed"></div>
      </div>
    </section>

    <!-- ================= RECORD ================= -->
    <section class="view" id="view-record">
      <div class="record-hero">
        <div class="rh-icon">🕊️</div>
        <div class="rh-text">
          <div class="rh-title" id="recordHeroTitle">今日も、一歩。</div>
          <div class="rh-sub" id="recordHeroSub"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>配布を記録する</h3></div>
        <div class="field" style="margin-bottom:12px;">
          <label>👤 担当者</label>
          <select id="fMember"></select>
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label>🗺️ 地区</label>
          <select id="fDistrict"></select>
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label>📍 配布エリア（町丁目・字）</label>
          <select id="fArea"></select>
          <div class="hint" id="areaHint"></div>
        </div>
        <div class="impact-preview" id="impactPreview">
          <div class="ip-row"><span class="ip-label">この記録でのエリア進捗</span><span class="ip-val" id="ipVal">—</span></div>
          <div class="ip-bar-wrap"><div class="ip-bar-before" id="ipBarBefore"></div><div class="ip-bar-after" id="ipBarAfter"></div></div>
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label>📅 配布日</label>
          <input type="date" id="fDate">
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label>📦 配布枚数（世帯数）</label>
          <div class="stepper">
            <button type="button" id="stepMinus">−</button>
            <input type="text" inputmode="numeric" id="fCount" value="10">
            <button type="button" id="stepPlus">＋</button>
          </div>
          <button type="button" class="qchip" id="fillRemaining" style="margin-top:9px;">🏠 残りの世帯数を一気に入力</button>
        </div>
        <div class="field" style="margin-bottom:14px;">
          <label>📝 現場メモ（任意）</label>
          <textarea id="fMemo" placeholder="例：不在が多め／再訪予定／好意的な反応あり"></textarea>
          <div class="chip-row" id="memoChips"></div>
        </div>
        <button class="btn-primary" id="submitRecord">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          この記録を保存する
        </button>
      </div>

      <div class="card" id="recentAreaCard">
        <div class="card-title"><h3>最近記録したエリア</h3></div>
        <div class="chip-row" id="recentAreaChips"></div>
        <div class="empty-note" id="recentAreaEmpty" style="display:none;">まだ記録がありません。最初の一歩を踏み出しましょう。</div>
      </div>
    </section>

    <!-- ================= AREAS ================= -->
    <section class="view" id="view-areas">
      <div class="seg" id="areaModeSeg">
        <button data-mode="map" class="active">地図</button>
        <button data-mode="list">リスト</button>
      </div>

      <div id="areaMapPane">
        <div class="card mapwrap">
          <div class="map-toolbar">
            <h3>実測地図</h3>
            <div class="map-zoom-btns">
              <button id="mapZoomOut" aria-label="縮小">−</button>
              <button id="mapZoomFit">全体</button>
              <button id="mapZoomIn" aria-label="拡大">＋</button>
            </div>
          </div>
          <div class="map-svg-wrap" id="mapSvgWrap">
            <div id="realMapEl" class="leaflet-real"></div>
            <div class="map-hint">ドラッグで移動・ピンチ/ホイールで拡大縮小</div>
          </div>
          <div class="filter-chip-row map-district-jump" id="mapDistrictJump"></div>
          <div class="legend" style="padding:12px 16px 16px;">
            <span class="sw"><span class="dot" style="background:var(--p-empty);"></span>未着手</span>
            <span class="sw"><span class="dot" style="background:var(--p-mid);"></span>進行中</span>
            <span class="sw"><span class="dot" style="background:var(--p-done);"></span>完了</span>
            <span class="sw"><span class="dot" style="background:var(--border);"></span>データなし</span>
          </div>
        </div>
        <div class="empty-note">※国勢調査 小地域境界データを基にした実際の町丁目・字の形状です。世帯数が非公開の一部地域と、ごく小規模な字（数世帯程度）は個別の形状を持たないため「データなし」表示、またはリスト表示のみとなります。</div>

        <div class="card" id="routeDirectionsCard" style="display:none;">
          <div class="card-title"><h3>🚶 配布ルートの道順</h3><button class="link" id="routeDirectionsClose">閉じる</button></div>
          <div class="hint" id="routeDirectionsSummary" style="margin-bottom:8px;"></div>
          <div id="routeDirectionsList"></div>
        </div>
      </div>

      <div id="areaListPane" style="display:none;">
        <div class="card">
          <div class="search-bar" style="margin-bottom:10px;">
            <input type="text" id="areaSearch" placeholder="町丁目・字名で検索">
          </div>
          <div class="filter-chip-row" id="districtFilterRow"></div>
          <div class="filter-chip-row" style="margin-top:7px;" id="statusFilterRow">
            <button class="filter-chip on" data-status="all">すべて</button>
            <button class="filter-chip" data-status="none">未着手</button>
            <button class="filter-chip" data-status="doing">進行中</button>
            <button class="filter-chip" data-status="done">完了</button>
          </div>
          <hr class="sep" style="margin:12px 0 4px;">
          <div id="areaListWrap"></div>
        </div>
      </div>
    </section>

    <!-- ================= RANKING ================= -->
    <section class="view" id="view-ranking">
      <div class="card">
        <div class="card-title"><h3>メンバーランキング</h3></div>
        <div class="seg" id="rankRangeSeg" style="margin-bottom:12px;">
          <button data-range="week" class="active">今週</button>
          <button data-range="month">今月</button>
          <button data-range="all">累計</button>
        </div>
        <div id="rankFull"></div>
      </div>

      <div class="card">
        <div class="card-title"><h3>実績バッジ一覧</h3></div>
        <div id="badgeGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;"></div>
      </div>

      <div class="card">
        <div class="card-title"><h3>地区別 制覇状況</h3></div>
        <div id="districtProgressList"></div>
      </div>
    </section>
  </main>

  <nav class="tabbar">
    <button class="tab-btn active" data-nav="home">
      <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
      ホーム
    </button>
    <button class="tab-btn" data-nav="record">
      <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      記録
    </button>
    <button class="tab-btn" data-nav="areas">
      <svg viewBox="0 0 24 24"><path d="M9 3v15M15 6v15M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/></svg>
      エリア
    </button>
    <button class="tab-btn" data-nav="ranking">
      <svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3"/></svg>
      ランキング
    </button>
  </nav>

  <div class="toast-wrap" id="toastWrap"></div>

  <div class="overlay" id="overlay">
    <div class="sheet" id="sheetBody"></div>
  </div>
</div>


`;
