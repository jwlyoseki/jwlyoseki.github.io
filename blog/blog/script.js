/* --- 1. 初始化 Supabase --- */  
const supabaseUrl = 'https://wdjnjwzjopqixemtgnja.supabase.co';  
const supabaseKey = 'sb_publishable_DpiLkyhpLsx6XG831qva5A_Hzc-3MiG';  

window.myClient = supabase.createClient(supabaseUrl, supabaseKey);  
const _supabase = window.myClient;


/* --- 2. 数据状态 --- */
let songData = [];         // 初始全量数据（现在是空的，等数据库填满它）
let filteredData = [];     // 筛选后的数据
const songsPerPage = 20;
let currentPage = 1;
let weekPlans = [];

/* --- 3. 获取数据库数据并启动 --- */
async function initApp() {
    console.log('正在获取所有数据...');

    // 同时获取歌单和周计划
    // .order('order') 确保周一在最前面，周日在最后面
    const [songsResponse, plansResponse] = await Promise.all([
        _supabase.from('playlist').select('*').order('id', { ascending: true }),
        _supabase.from('weekly_plans').select('*').order('order', { ascending: true })
    ]);

    // 处理歌单数据
    if (songsResponse.error) {
        console.error('歌单加载失败:', songsResponse.error);
    } else {
        songData = songsResponse.data;
        filteredData = songsResponse.data;
        renderPlaylistPage(1);
    }

    // 处理周计划数据
    if (plansResponse.error) {
        console.error('周计划加载失败:', plansResponse.error);
    } else {
        weekPlans = plansResponse.data;
        renderWeekSchedule(); // 运行你原来的周计划渲染函数
        console.log('周计划加载成功:', weekPlans);
    }
}

// 别忘了把原本的 initMusic() 改成调用这个新名字
initApp();




// Club 固定回馈数据
const vipPerks = [
    { level: 30, perk: "获得小卷骨架老鼠干" },
    { level: 31, perk: "获得怪叫毛绒挂件" },
    { level: 32, perk: "获得金属光刻键帽" },
    { level: 33, perk: "未完待续" },
    { level: 34, perk: "未完待续" },
    { level: 35, perk: "未完待续" },
    { level: 36, perk: "未完待续" },
    { level: 37, perk: "未完待续" },
    { level: 38, perk: "未完待续" },
    { level: 39, perk: "未完待续" },
    { level: 40, perk: "未完待续" },
    { level: 41, perk: "未完待续" },
    { level: 42, perk: "未完待续" },
    { level: 43, perk: "未完待续" },
    { level: 44, perk: "未完待续" }
];

// --- 从数据库获取并统计 ---  
async function fetchPlaylistFromDB() {  
    const { data, error } = await window.myClient  
        .from('playlist')  
        .select('*');  

    if (error) {  
        console.error("数据库读取失败:", error);  
        return;  
    }  

    songData = data || [];  
    filteredData = [...songData]; // 初始状态筛选数据等于全量数据

    // 执行统计逻辑  
    const stats = { genre: {}, language: {} };  
    songData.forEach(song => {  
        if(song.genre) stats.genre[song.genre] = (stats.genre[song.genre] || 0) + 1;  
        if(song.language) stats.language[song.language] = (stats.language[song.language] || 0) + 1;  
    });  

    // 渲染统计面板  
    const statsPanel = document.getElementById('stats-panel');  
    if (statsPanel) {  
        const genreText = Object.entries(stats.genre).map(([k,v]) => `${k}(${v})`).join(' · ');  
        const langText = Object.entries(stats.language).map(([k,v]) => `${k}(${v})`).join(' · ');  
        statsPanel.innerHTML = `  
            <div style="font-size: 10px; color: #888; text-transform: uppercase; margin-bottom:5px; letter-spacing:2px;">Library Stats</div>  
            <div style="font-size: 11px; line-height: 1.6; color: #444;">  
                <b style="color: #000;">GENRES:</b> ${genreText || 'None'} <br>  
                <b style="color: #000;">LANGS:</b> ${langText || 'None'}  
            </div>  
        `;  
    }  

    // 绑定筛选事件监听
    initFilterListeners();
    
    // 初始渲染内容
    renderPlaylistPage(1);  
}  

/* --- 3. 筛选核心逻辑 --- */

function initFilterListeners() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const languageFilter = document.getElementById('languageFilter');

    const handleFilter = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedGenre = genreFilter.value;
        const selectedLanguage = languageFilter ? languageFilter.value : 'all';

        // 多重筛选逻辑
        filteredData = songData.filter(song => {
            const matchesSearch = !searchTerm || 
                (song.title && song.title.toLowerCase().includes(searchTerm)) || 
                (song.artist && song.artist.toLowerCase().includes(searchTerm));
            
            const matchesGenre = selectedGenre === 'all' || song.genre === selectedGenre;
            const matchesLanguage = selectedLanguage === 'all' || song.language === selectedLanguage;

            return matchesSearch && matchesGenre && matchesLanguage;
        });

        currentPage = 1; // 筛选后回到第一页
        renderPlaylistPage(1);
    };

    if(searchInput) searchInput.oninput = handleFilter;
    if(genreFilter) genreFilter.onchange = handleFilter;
    if(languageFilter) languageFilter.onchange = handleFilter;
}

/* --- 4. 渲染函数 --- */  

function renderPlaylistPage(page) {
    const grid = document.getElementById('songGrid');
    if (!grid) return;

    // 1. 处理搜索无结果的情况
    if (!filteredData || filteredData.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center; opacity:0.5; padding: 40px;'>未找到相关歌曲</p>";
        updatePaginationUI();
        return;
    }

    // 2. 计算分页数据
    const start = (page - 1) * songsPerPage;
    const end = start + songsPerPage;
    const paginatedSongs = filteredData.slice(start, end);

    // 3. 渲染歌曲列表（你的修改应该放在这里）
    grid.innerHTML = paginatedSongs.map(song => `  
        <div class="song-card" onclick="copyToClipboard('${song.title}')">  
            <h4>${song.title}</h4>  
            
            <p style="margin-top: 12px;">
                ${song.artist} / ${song.language || '未知'} / <span class="accent-text">${song.genre || 'Live'}</span>
            </p>  

            <div style="margin-top: 15px; font-size: 10px; opacity: 0.3; letter-spacing: 2px">CLICK TO COPY</div>  
        </div>  
    `).join('');

    updatePaginationUI();
}

function updatePaginationUI() {  
    const totalPages = Math.max(1, Math.ceil(filteredData.length / songsPerPage));  
    const info = document.getElementById('pageInfo');  
    const prev = document.getElementById('prevPage');  
    const next = document.getElementById('nextPage');  
    
    if(info) info.innerText = `Page ${currentPage} of ${totalPages}`;  
    if(prev) prev.disabled = currentPage === 1;  
    if(next) next.disabled = currentPage === totalPages || filteredData.length === 0;  
}  

// 分页监听按钮
document.getElementById('prevPage')?.addEventListener('click', () => {  
    if (currentPage > 1) {  
        currentPage--;  
        renderPlaylistPage(currentPage);  
        window.scrollTo({ top: document.querySelector('.section').offsetTop - 20, behavior: 'smooth' });
    }  
});  

document.getElementById('nextPage')?.addEventListener('click', () => {  
    const totalPages = Math.ceil(filteredData.length / songsPerPage);  
    if (currentPage < totalPages) {  
        currentPage++;  
        renderPlaylistPage(currentPage);  
        window.scrollTo({ top: document.querySelector('.section').offsetTop - 20, behavior: 'smooth' });
    }  
});  

/* --- 5. 辅助功能 (原有逻辑保持) --- */

function renderWeekSchedule() {  
    const container = document.getElementById('weekSchedule');  
    if(!container) return;  
    container.innerHTML = weekPlans.map(plan => `  
        <div class="day-card">  
            <div class="day-name">${plan.day}</div>  
            <div class="day-plan">${plan.plan}</div>  
        </div>  
    `).join('');  
}  

function renderVipCards() {  
    const container = document.getElementById('vipCardsContainer');  
    if(!container) return;  
    container.innerHTML = vipPerks.map(vip => `  
        <div class="v-card ${vip.level % 2 === 0 ? 'silver' : 'gold'}">  
            <span class="v-level">LV.${String(vip.level).padStart(2, '0')}</span>  
            <p>${vip.perk}</p>  
        </div>  
    `).join('');  
}  

function copyToClipboard(text) {  
    navigator.clipboard.writeText(text).then(() => {  
        const toast = document.getElementById('toast');  
        if (toast) {  
            toast.innerText = "已成功复制歌名 ✨";   
            toast.classList.add('show');  
            setTimeout(() => { toast.classList.remove('show'); }, 2000);  
        }  
    });  
}  

// 匿名信息弹出层处理
const modal = document.getElementById('askModal');  
const openAskBtn = document.getElementById('openAsk');  
if(openAskBtn) { openAskBtn.onclick = () => { modal.style.display = 'flex'; }; }  
const closeAskBtn = document.getElementById('closeAsk');  
if(closeAskBtn) { closeAskBtn.onclick = () => { modal.style.display = 'none'; }; }  
window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };  

const sendAskBtn = document.getElementById('sendAsk');  
if(sendAskBtn) {  
    sendAskBtn.onclick = async () => {  
        const askInput = document.getElementById('askInput');  
        const val = askInput.value.trim();  
        if (val) {  
            const { error } = await window.myClient.from('messages').insert([{ content: val }]);  
            if (error) { alert('失败了：' + error.message); return; }  
            const toast = document.getElementById('toast');  
            if (toast) {  
                toast.innerText = "信息已从云端寄出... 📮";   
                toast.classList.add('show');  
                setTimeout(() => { toast.classList.remove('show'); }, 2000);  
            }  
            askInput.value = '';  
            modal.style.display = 'none';  
        }  
    };  
}  

async function initFeedbackBoard() {
    const emojis = ['😊', '✨', '🎵', '🔥', '💗', '👍', '🌟', '🍀', '🎈', '🎨', '☕', '🥂', '🌙', '🌈', '🌊'];
    const picker = document.getElementById('emojiPicker');
    const msgInput = document.getElementById('msgInput');
    const msgList = document.getElementById('messageList');
    const postBtn = document.getElementById('postMsg');

    // 1. 初始化 Emoji 点击选择
    if (picker) {
        picker.innerHTML = emojis.map(e => `<span class="emoji-item" style="cursor:pointer; margin-right:8px; font-size:1.2rem;">${e}</span>`).join('');
        picker.querySelectorAll('.emoji-item').forEach(el => {
            el.onclick = () => { msgInput.value += el.innerText; };
        });
    }

    // 2. 从数据库 audience_comments 表读取留言
    async function fetchComments() {
        const { data, error } = await _supabase
            .from('audience_comments') // 改成留言板的表名
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            // 清空旧内容，动态生成新内容
            msgList.innerHTML = `
                <div class="msg-item">
                    <p class="msg-text">Welcome to The Yoseki space. Feel free to leave a message.</p>
                    <small>@Editor — Archive</small>
                </div>
            `;
            
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'msg-item';
                // 格式化日期：例如 2023/10/27
                const time = new Date(item.created_at).toLocaleDateString();
                div.innerHTML = `
                    <p class="msg-text">${item.content}</p>
                    <small>@Visitor — ${time}</small>
                `;
                msgList.appendChild(div);
            });
        } else if (error) {
            console.error("读取留言失败:", error.message);
        }
        
    }

    // 3. 发送留言到 audience_comments 表
    if (postBtn) {
        postBtn.onclick = async () => {
            const text = msgInput.value.trim();
            if (!text) return;

            postBtn.disabled = true;
            postBtn.innerText = "...";

            // 注意：这里确保你的表里有 'content' 这一列
            const { error } = await _supabase
                .from('audience_comments') 
                .insert([{ content: text }]);

            if (!error) {
                msgInput.value = '';
                await fetchComments(); // 成功后刷新列表
            } else {
                alert("发送失败：" + error.message);
            }

            postBtn.disabled = false;
            postBtn.innerText = "POST";
        };
    }

    // 4. 初次进入页面加载留言
    fetchComments();
}

function initCarousel() {  
    const track = document.getElementById('carouselTrack');  
    const nav = document.getElementById('carouselNav');  
    if (!track || !nav) return;  
    const slides = Array.from(track.children);  
    if (slides.length === 0) return;  
    let currentIndex = 0;  
    nav.innerHTML = '';  
    slides.forEach((_, i) => {  
        const dot = document.createElement('div');  
        dot.className = i === 0 ? 'dot active' : 'dot';  
        nav.appendChild(dot);  
    });  
    const dots = Array.from(nav.children);  
    function updateCarousel() {  
        track.style.transform = `translateX(-${currentIndex * 100}%)`;  
        dots.forEach((dot, i) => { dot.classList.toggle('active', i === currentIndex); });  
    }  
    function nextSlide() { currentIndex = (currentIndex + 1) % slides.length; updateCarousel(); }  
    setInterval(nextSlide, 3000);  
}  

const backToTopBtn = document.getElementById('backToTop');  
if(backToTopBtn) {  
    window.addEventListener('scroll', () => {  
        if (window.scrollY > 300) { backToTopBtn.classList.add('show'); }   
        else { backToTopBtn.classList.remove('show'); }  
    });  
    backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });  
}  

// --- 6. 统一页面初始化 ---  
window.onload = () => {  
    renderWeekSchedule();  
    renderVipCards();  
    fetchPlaylistFromDB();  
    initFeedbackBoard();  
    initCarousel();  
};