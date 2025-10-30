// Googleスプレッドシートの公開URL（CSV形式）
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmD6a719383wDZtTyW8HV8wGTBOck7I9E9YbswgMG1E6w2cX7WeH9bZ7hR1hVplBibhrhBmWmzbkpG/pub?gid=1902676381&single=true&output=csv';

// DOMが読み込まれたら処理を開始
document.addEventListener('DOMContentLoaded', () => {
    // スプレッドシートの公開URLをCSV形式に変換
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmD6a719383wDZtTyW8HV8wGTBOck7I9E9YbswgMG1E6w2cX7WeH9bZ7hR1hVplBibhrhBmWmzbkpG/pub?gid=1902676381&single=true&output=csv';

    // DOM要素の取得
    const mainContent = document.querySelector('main');
    const initialLoader = document.getElementById('initial-loader');
    const searchBox = document.getElementById('search-box');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const typeFilterButtons = document.querySelectorAll('.type-filter');
    const memberFilterButtons = document.querySelectorAll('.member-filter');
    const videoFilterButtons = document.querySelectorAll('.video-filter');
    const yearSelector = document.getElementById('year-selector');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const resultsCountEl = document.getElementById('results-count');
    const tableBody = document.getElementById('data-table-body');
    const tableContainer = document.querySelector('.table-container');
    const headers = document.querySelectorAll('th');
    const playerBar = document.getElementById('music-player-bar');
    const playerContainer = document.getElementById('player-container');
    const closePlayerBtn = document.getElementById('close-player-btn');

    // 状態を管理する変数
    let originalData = [];
    let searchQuery = '';
    let typeFilters = [];
    let memberFilters = [];
    let yearFilter = 'all'
    let videoFilter = 'all';
    let sortState = { key: 'id', order: 'desc' };

    // データの取得と初回表示
    fetchAndDisplayData();

    const ids_group = [
        ['filter-ebc', 'filter-5572320', 'filter-infinities'],
        ['filter-solo', 'filter-unit'],
        ['filter-video-yes', 'filter-video-no']
    ]

    // フィルタボタンの変更イベント
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const clickedId = btn.id;
            // 同じグループ内の他のボタンを非アクティブ化
            for (const group of ids_group) {
                if (group.includes(clickedId)) {
                    group.forEach(id => {
                        if (id !== clickedId) {
                            document.getElementById(id).classList.remove('active');
                        }
                    });
                }
            }

            // クリックされたボタンのアクティブ化
            btn.classList.toggle('active');
            updateFilters(); // フィルターを更新
        });
    });

    // フィルターを更新する関数 (updateFilters)
    const updateFilters = () => {
        // .active クラスを持つボタンから data-value を収集
        typeFilters = Array.from(typeFilterButtons)
            .filter(btn => btn.classList.contains('active'))
            .map(btn => btn.dataset.value);
        memberFilters = Array.from(memberFilterButtons)
            .filter(btn => btn.classList.contains('active'))
            .map(btn => btn.dataset.value);
        videoFilter = Array.from(videoFilterButtons)
            .find(btn => btn.classList.contains('active'))?.dataset.value || 'all';

        filterSortAndRender(); // 再描画
    };

    // 検索ボックスの入力イベント
    searchBox.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase(); // 検索語を小文字で保持
        filterSortAndRender();

        // 入力値があればボタンを表示、なければ非表示
        if (searchBox.value.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
    });

    // クリアボタンのクリックイベント
    clearSearchBtn.addEventListener('click', () => {
        // 入力内容を空にする
        searchBox.value = '';
        searchQuery = '';
        filterSortAndRender();
        
        // ボタンを非表示にする
        clearSearchBtn.style.display = 'none';
    });

    yearSelector.addEventListener('change', () => {
        yearFilter = yearSelector.value; // 'all' または '2025' などを保存
        filterSortAndRender(); // 再描画
    });

    resetAllBtn.addEventListener('click', () => {
        // フリーワード検索をリセット
        searchBox.value = '';
        clearSearchBtn.style.display = 'none';
        searchQuery = '';

        // 絞り込みフィルターをリセット
        filterButtons.forEach(btn => btn.classList.remove('active'));
        typeFilters = [];
        memberFilters = [];

        // 年フィルターをリセット
        yearSelector.value = 'all';
        yearFilter = 'all';

        // 並び替えをリセット
        sortState = { key: 'id', order: 'desc' };

        // すべての変更を反映して再描画
        filterSortAndRender();
    });

    // 各ヘッダーのクリックイベント（ソート用）
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const key = header.dataset.key;
            if (!key) return; // data-keyがないヘッダーは無視

            const newOrder = (sortState.key === key && sortState.order === 'asc') ? 'desc' : 'asc';
            sortState = { key, order: newOrder };
            filterSortAndRender(); // ソート後も絞り込み状態を維持して再表示
        });
    });

    tableBody.addEventListener('click', (event) => {
        // クリックされた要素が再生ボタン (.play-music-btn) かどうかを判定
        if (event.target.classList.contains('play-music-btn')) {
            
            // (重要) 行のクリックイベント（YouTube動画展開）が発火しないように伝播を停止
            event.stopPropagation(); 
            
            const trackId = event.target.dataset.trackId;
            if (trackId) {
                updateMusicPlayer(trackId);
            }
        }
    });

    /**
     * CSVデータを取得してテーブルを描画する
     */
    async function fetchAndDisplayData() {
        try {
            const response = await fetch(CSV_URL);
            if (!response.ok) throw new Error('データ取得失敗');
            const csvText = await response.text();
            originalData = parseCSV(csvText);
            initializeYearSelector(originalData)
            filterSortAndRender(); // 初回表示
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="${headers.length}">データ読込失敗</td></tr>`;
        } finally {
            // 成功・失敗どちらの場合でもローダーを非表示にする
            initialLoader.style.display = 'none';
        }
    }

    /**
     * CSVテキストをオブジェクトの配列に変換する
     * @param {string} csvText - CSV形式の文字列
     * @returns {Array<Object>}
     */
    function parseCSV(csvText) {
        const lines = csvText.trim().split(/\r?\n/);
        const header = lines[0].split(',');
        
        return lines.slice(1).map(line => {
            const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            const values = line.split(regex);
            const entry = {};
            header.forEach((key, index) => {
                const value = values[index];
                if (value !== undefined && value !== null) {
                    entry[key] = value.replace(/^"|"$/g, '');
                } else {
                    entry[key] = '';
                }
            });
            return entry;
        });
    }

    /**
     * データから年を抽出し、ドロップダウンメニューを作成する
     * @param {Array<Object>} data 
     */
    function initializeYearSelector(data) {
        // '年' 列からデータを直接抽出
        const years = data.map(item => item['年'] || null);
        const uniqueYears = [...new Set(years)];

        // HTMLの <option> 要素を生成
        yearSelector.innerHTML = ''; // 中身をクリア

        // 「すべての年」を追加
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'すべての年';
        yearSelector.appendChild(allOption);

        // 各年を追加
        uniqueYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}年`;
            yearSelector.appendChild(option);
        });
    }

    /**
     * 絞り込み、ソート、描画をまとめて行う関数
     */
    function filterSortAndRender() {
        const soloMembers = [
            '真山', '安本', '廣田', '星名', '松野', '柏木', 
            '小林', '中山', '桜木', '小久保', '風見', '桜井', '仲村'
        ]

        // 絞り込み
        let filteredData = [...originalData];
        if (searchQuery) {
            filteredData = originalData.filter(item => {
                // 検索対象にしたい列を「|」でつなげる
                const searchableText = [
                    item['曲名'],
                    item['タグ'],
                    item['歌手名'],
                    item['読み仮名'],
                    item['収録作品'],
                    item['作詞者'],
                    item['作曲者'],
                    item['編曲者']
                ].join('|').replaceAll(' ', '').toLowerCase(); // 空白削除＆小文字化
                // 空白で区切り、すべてのキーワードが含まれるかをチェック（AND検索）
                return searchQuery.split(/\s+/g).every(keyword => searchableText.includes(keyword));
            });
        }

        // 楽曲タイプで絞り込み
        if (typeFilters.length > 0) {
            filteredData = filteredData.filter(item => {
                // 判定に使う文字列を曲ごとに生成
                const tag = item['タグ'] || '';

                // フィルタすべてに合致するかをチェック（AND検索）
                return typeFilters.every(filter => {
                    if (filter === 'ソロ') {
                        return !tag.includes('ユニット') && soloMembers.some(member => tag.includes(member));
                    } else if (filter === '動画あり') {
                        return item['YouTube'] !== '';
                    }
                    return tag.includes(filter);
                });
            });
        }

        // メンバーで絞り込み
        if (memberFilters.length > 0) {
            filteredData = filteredData.filter(item => {
                // タグにメンバーがすべて含まれているかをチェック（AND検索）
                const tag = item['タグ'] || '';
                return memberFilters.every(member => {
                    return tag.includes(member);
                });
            });
        }

        // 年で絞り込み
        if (yearFilter !== 'all') {
            filteredData = filteredData.filter(item => {
                return item['年'] == yearFilter;
            });
        }

        // 動画の有無での絞り込み
        if (videoFilter === 'yes') {
            filteredData = filteredData.filter(item => item['YouTube'] !== '');
        } else if (videoFilter === 'no') {
            filteredData = filteredData.filter(item => item['YouTube'] === '');
        }

        // 並び替え
        const { key, order } = sortState;
        const sortedData = [...filteredData].sort((a, b) => {
            const sortKey = key === '曲名' ? '読み仮名' : key;
            const valA = a[sortKey] || '';
            const valB = b[sortKey] || '';
            const direction = order === 'asc' ? 1 : -1;
            const emptyCompare = Number(valA === '') - Number(valB === '');
            let primaryCompare;
            if (key === '動画') {
                primaryCompare = (a['YouTube'] !== '') - (b['YouTube'] !== '');
            } else {
                primaryCompare = valA.localeCompare(valB, 'ja');
            }
            const tieBreaker = Number(a.id) - Number(b.id);

            // 空白判定 → メイン比較 → ID比較 の優先順位で評価
            return direction * (emptyCompare || primaryCompare || tieBreaker);
        });

        // 検索結果数の表示更新
        resultsCountEl.innerHTML = `検索結果：<span id="count-number">${sortedData.length}</span>曲`;

        // 描画
        renderTable(sortedData);
        updateHeaderStyles();
        tableContainer.scrollTop = 0;
    }

    /**
     * テーブルのボディ部分を描画する
     * @param {Array<Object>} data - 表示するデータ
     */
    function renderTable(data) {
        tableBody.innerHTML = ''; // テーブルをクリア
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${headers.length}">該当する楽曲がありません。</td></tr>`;
            return;
        }

        const rootStyles = window.getComputedStyle(document.documentElement);
        let dataRowIndex = 0;
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            // 偶数行に色をつける
            if (dataRowIndex % 2 === 1) {
                tr.classList.add('striped-row');
            }
            const displayOrder = ['曲名', 'タグ', 'リリース日', '収録作品', '作詞者', '作曲者', '編曲者', '動画', '音源'];
            
            displayOrder.forEach(key => {
                const td = document.createElement('td');
                // タグ列は特別処理
                if (key === 'タグ') {
                    // 準備した表示用のタグ文字列を渡す
                    tr.appendChild(createTagsCell(row['タグ'] || ''));
                    return;
                } else if (key === '動画') {
                    const hasVideo = row['YouTube'];
                    if (hasVideo) {
                        // 再生ボタンを設置し、data属性にIDを持たせる
                        td.innerHTML = `<img src="/images/youtube.png" alt="再生" class="youtube-icon">`;
                    }
                } else if (key === '音源') {
                    const trackId = row[key];
                    if (trackId) {
                        // 再生ボタンを設置し、data属性にIDを持たせる
                        td.innerHTML = `<img src="/images/button-play.svg" alt="再生" class="play-music-btn" data-track-id="${trackId}">`;
                    }
                } else {
                    td.textContent = row[key] || '';
                }
                tr.appendChild(td);
            });

            // YouTubeリンクがあれば、行をクリック可能にする
            if (row['YouTube']) {
                tr.classList.add('clickable-row');
                tr.addEventListener('click', (event) => {
                    // 再生ボタンが押された場合は、toggleDetailsを実行しない
                    if (event.target.closest('.play-music-btn')) {
                        return;
                    }
                    toggleDetails(tr, row);
                });
            } else {
                tr.addEventListener('click', () => {
                    handleRowSelection(tr);
                });
            }
            
            const firstTag = tr.querySelector('.tag-block');
            // tag-block以外のクラスを一つ取得
            const tagClass = firstTag.classList.item(1);
            const tagColor = rootStyles.getPropertyValue('--color-'+tagClass.replace('tag-', '')) || rootStyles.getPropertyValue('--color-default');
            tr.style.setProperty('--color-active', tagColor + '30');

            tableBody.appendChild(tr);
            dataRowIndex++;
        });
    }

    /**
     * ヘッダーのスタイル（ソート矢印）を更新する
     */
    function updateHeaderStyles() {
        headers.forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.key === sortState.key) {
                th.classList.add(sortState.order === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
    }

    /**
     * タグ列のセルを生成する
     * @param {string} tagsString - 「、」で区切られたタグ文字列
     * @returns {HTMLTableCellElement}
     */
    function createTagsCell(tagsString) {
        const td = document.createElement('td');
        if (!tagsString) return td;

        // キーワードとクラスの対応表を作成
        const tagClassMap = {
            '私立恵比寿中学': 'tag-ebc',
            'カバー': 'tag-cover',
            '五五七二三二〇': 'tag-5572320',
            'インフィニティーズ': 'tag-infinities',
            'オリジナル': 'tag-5',
            '瑞季': 'tag-1',
            '真山': 'tag-3',
            '杏野': 'tag-4',
            '安本': 'tag-5',
            '廣田': 'tag-6',
            '星名': 'tag-7',
            '鈴木': 'tag-8',
            '松野': 'tag-9',
            '柏木': 'tag-10',
            '小林': 'tag-11',
            '中山': 'tag-12',
            '桜木': 'tag-13',
            '小久保': 'tag-14',
            '風見': 'tag-15',
            '桜井': 'tag-16',
            '仲村': 'tag-17'
        };
        const defaultClass = 'tag-default';

        const tags = tagsString.split('、');

        tags.forEach(tag => {
            const span = document.createElement('span');
            span.classList.add('tag-block');
            span.textContent = tag;

            let addedClass = false;
            // tagClassMapの各キー（'ユニット', 'ソロ' ...）をチェック
            for (const keyword in tagClassMap) {
                // タグ文字列にキーワードが含まれているかチェック
                if (tag == keyword) {
                    span.classList.add(tagClassMap[keyword]);
                    addedClass = true;
                    break; // 一致したらループを抜ける
                }
            }

            // どのキーワードにも一致しなかった場合、デフォルトのクラスを適用
            if (!addedClass) {
                span.classList.add(defaultClass);
            }
            
            td.appendChild(span);
        });
        return td;
    }

    /**
     * 詳細（YouTube動画）の表示を切り替える
     * @param {HTMLTableRowElement} clickedRow - クリックされた行
     * @param {object} rowData - その行のデータ
     */
    function toggleDetails(clickedRow, rowData) {
        // 1. クリックされた行の「次」の要素が詳細行（.details-row）か確認
        const nextRow = clickedRow.nextElementSibling;
        const isOpen = nextRow && nextRow.classList.contains('details-row');

        if (isOpen) {
            // 2. もし開いていたら：閉じる
            nextRow.querySelector('.details-content').classList.remove('open');
            clickedRow.classList.remove('active-row');

            // 他に選択されている行があれば先に選択解除
            const currentlySelectedRows = tableBody.querySelectorAll('tr.selected-row:not(.active-row)');
            if (currentlySelectedRows.length > 0) {
                currentlySelectedRows.forEach(row => {
                    if (row !== clickedRow) {
                        row.classList.remove('selected-row');
                    }
                });
            }
            
            // アニメーションのために少し待ってから削除
            setTimeout(() => {
                if (document.body.contains(nextRow)) {
                    nextRow.remove();
                }
                clickedRow.classList.remove('selected-row');
            }, 400); // 閉じるアニメーションの時間

            return;
        }

        clickedRow.classList.add('active-row');
        handleRowSelection(clickedRow);
        
        // --- DOM要素の骨組みを作成 ---
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row';
        const detailsCell = document.createElement('td');
        detailsCell.colSpan = clickedRow.cells.length;
        detailsCell.className = 'details-cell';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'details-content';
        contentDiv.style.setProperty('--color-active', clickedRow.style.getPropertyValue('--color-active'));
        const scrollerWrapper = document.createElement('div');
        scrollerWrapper.className = 'video-scroller-wrapper';
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';

        const videoIds = rowData['YouTube'].split('、').map(id => id.trim()).filter(id => id);

        // 先に「空の箱（スピナー）」だけを配置
        if (videoIds.length > 0) {
            videoIds.forEach(() => {
                const wrapper = document.createElement('div');
                wrapper.className = 'video-wrapper';
                // スピナーを中に入れる
                wrapper.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
                videoContainer.appendChild(wrapper);
            });
        } else {
            videoContainer.textContent = '関連動画はありません。';
        }

        scrollerWrapper.appendChild(videoContainer);
        contentDiv.appendChild(scrollerWrapper);
        detailsCell.appendChild(contentDiv);
        detailsRow.appendChild(detailsCell);
        clickedRow.after(detailsRow);

        // アニメーション完了後に「重い処理」を実行
        contentDiv.addEventListener('transitionend', () => {
            if (videoIds.length === 0) return;

            const wrappers = videoContainer.querySelectorAll('.video-wrapper');
            const table = document.querySelector('.table-container table');
            const tableWidth = table.offsetWidth;
            const scale = tableWidth / 1250;

            wrappers.forEach((wrapper, index) => {
                const videoId = videoIds[index];
                if (!videoId) return;

                // スピナー要素を先に取得
                const spinner = wrapper.querySelector('.spinner-container');

                const iframe = document.createElement('iframe');
                iframe.className = 'youtube-embed';
                iframe.style.visibility = 'hidden';
                iframe.style.width = `${100 / scale}%`;
                iframe.style.transform = `scale(${scale})`;
                iframe.style.transformOrigin = 'top left';

                iframe.onload = () => {
                    // 読み込みが完了したら、スピナーだけ削除
                    if (spinner) {
                        wrapper.removeChild(spinner);
                    }
                    // iframeを表示
                    iframe.style.visibility = 'visible';
                };

                iframe.src = `https://www.youtube.com/embed/${videoId}`;
                iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                iframe.allowFullscreen = true;
                
                // iframeはラッパーに1回だけ追加
                wrapper.appendChild(iframe);
            });
        }, { once: true }); // イベントは1回だけ実行

        // アニメーションを開始
        setTimeout(() => {
            contentDiv.classList.add('open');
        }, 10);
    }

    /**
     * 行の選択状態を切り替える
     * @param {HTMLTableRowElement} clickedRow - クリックされた行
     */
    function handleRowSelection(clickedRow) {
        // クリックした行が既に選択されていたか判定
        const isAlreadySelected = clickedRow.classList.contains('selected-row');
        // 既に選択されている他の行をクリア
        const currentlySelectedRows = tableBody.querySelectorAll('tr.selected-row:not(.active-row)');
        if (currentlySelectedRows.length > 0) {
            currentlySelectedRows.forEach(row => {
                row.classList.remove('selected-row');
            });
        }
        // 新しく別の行をクリックした場合は 'selected-row' を追加
        if (!isAlreadySelected) {
            clickedRow.classList.add('selected-row');
        }
    }

    /**
     * 音楽プレーヤーバーにLINE MUSICのiframeを読み込む
     * @param {string} trackId - LINE MUSICのトラックID
     */
    function updateMusicPlayer(trackId) {
        if (!playerContainer) {
            console.error('ID "player-container" が見つかりません。');
            return;
        }

        const embedUrl = `https://music.line.me/webapp/embed/track/${trackId}?isPC=true&autoPlay=true&width=2600&height=154`;
        
        // 同じ曲が選択された場合
        if (playerContainer.dataset.trackId === trackId) {
            console.log('同じ曲が選択されました。再生ボタンを押します。');
            // 同じ曲が再生中なら再生ボタンを押す
            const lineMusicFrame = document.querySelector("#music-player-bar iframe");
            if (lineMusicFrame) {
                lineMusicFrame.src = embedUrl; // 再読み込みで再生
            }
            return;
        }
    
        // ご要望のiframeでプレーヤーバーの中身を上書き
        playerContainer.innerHTML = `
            <iframe 
                src="${embedUrl}" 
                frameborder="no"
                scrolling="no"
                marginwidth="0"
                marginheight="0"
                allow="autoplay"
                allowfullscreen>
            </iframe>`;
        
        playerContainer.dataset.trackId = trackId;
        
        playerBar.classList.remove('hidden');
        mainContent.style.marginBottom = '77px';
    }

    // 再生バーを閉じるボタンのクリックイベント
    closePlayerBtn.addEventListener('click', () => {
        playerBar.classList.add('hidden');
        playerContainer.innerHTML = '';
        playerContainer.dataset.trackId = '';
        mainContent.style.marginBottom = '10px';
    });
});