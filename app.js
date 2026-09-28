/* ═══════════════ SUPABASE CONFIG ═══════════════ */
//const SUPABASE_ANON_KEY = "INVALID_KEY";
const SUPABASE_URL      = "https://anouachicwdraxgkldpy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uS43iU0j2vJfG99psuU-Mg_FFdRMW-6";

/* ═══════════════ DATA ═══════════════ */
const SUBJECT_SLUGS = {
    'English':'english','Calculus':'calculus','Physics':'physics',
    'Chemistry':'chemistry','Biology':'biology','Statistics':'statistics'
};
function iconImg(sub){
    const slug = SUBJECT_SLUGS[sub] || 'physics';
    return '<img class="subj-ic" src="icons/'+slug+'.png" alt="">';
}

const subjectData = {
    'English':{'icon':iconImg('English'),'count':4},'Calculus':{'icon':iconImg('Calculus'),'count':3},
    'Physics':{'icon':iconImg('Physics'),'count':5},'Chemistry':{'icon':iconImg('Chemistry'),'count':2},
    'Biology':{'icon':iconImg('Biology'),'count':6},'Statistics':{'icon':iconImg('Statistics'),'count':4}
};

let resourcesDB = { 'Notes':{}, 'Past Papers':{}, 'Teacher Slides':{} };

/* Maps Supabase category values to the display "type" used here. */
const CATEGORY_TO_TYPE = { 'notes':'Notes', 'past_paper':'Past Papers', 'teacher_material':'Teacher Slides' };

async function sbQuery(path){
    const res = await fetch(SUPABASE_URL+'/rest/v1/'+path, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer '+SUPABASE_ANON_KEY }
    });
    if(!res.ok) throw new Error('Supabase returned '+res.status);
    return res.json();
}

async function loadResourcesFromSupabase(){
    // Pull every notes / past_paper / teacher_material resource with its subject name embedded.
    const rows = await sbQuery(
        'resources?category=in.(notes,past_paper,teacher_material)' +
        '&select=category,title,url,year,description,format,standard,subjects(name)' +
        '&order=sort_order.asc'
    );
    const db = { 'Notes':{}, 'Past Papers':{}, 'Teacher Slides':{} };
    // paperLinks[subject]['standard|year|paperType'] = url  (for the grid overlay)
    const paperLinks = {};
    rows.forEach(r=>{
        const type = CATEGORY_TO_TYPE[r.category];
        const sub  = r.subjects && r.subjects.name;
        if(!type || !sub) return;
        if(!db[type][sub]) db[type][sub] = [];
        db[type][sub].push({
            title: r.title,
            desc:  r.description || '',
            format:r.format || '',
            standard: r.standard || '',
            year: r.year || null,
            url:   r.url || '#'
        });
        if(r.category==='past_paper' && r.standard && r.format){
            if(!paperLinks[sub]) paperLinks[sub] = {};
            const yearKey = (r.format==='Formulae Booklet') ? 'ALL' : r.year;
            if(yearKey) paperLinks[sub][r.standard+'|'+yearKey+'|'+r.format] = r.url || '#';
        }
    });
    resourcesDB = db;
    window.__paperLinks = paperLinks;
}
const nceaStandards = {
    'Calculus':[
        {id:'91577',title:'Complex Numbers',desc:'Apply the algebra of complex numbers in solving problems',hasResource:true},
        {id:'91578',title:'Differentiation',desc:'Apply differentiation methods in solving problems',hasResource:false},
        {id:'91579',title:'Integration',desc:'Apply integration methods in solving problems',hasResource:false}
    ],
    'English':[
        {id:'91472',title:'Written Text',desc:'Respond critically to specified aspect(s) of studied written text(s)',hasResource:false},
        {id:'91473',title:'Visual Text',desc:'Respond critically to specified aspect(s) of studied visual or oral text(s)',hasResource:false},
        {id:'91474',title:'Unfamiliar Text',desc:'Respond critically to significant aspects of unfamiliar written texts',hasResource:true}
    ],
    'Physics':[
        {id:'91523',title:'Wave Systems',desc:'Demonstrate understanding of wave systems',hasResource:true},
        {id:'91524',title:'Mechanical Systems',desc:'Demonstrate understanding of mechanical systems',hasResource:true},
        {id:'91526',title:'Electrical Systems',desc:'Demonstrate understanding of electrical systems',hasResource:true}
    ],
    'Chemistry':[
        {id:'91390',title:'Thermochemical Principles',desc:'Demonstrate understanding of thermochemical principles and the properties of particles and substances',hasResource:true},
        {id:'91391',title:'Organic Compounds',desc:'Demonstrate understanding of the properties of organic compounds',hasResource:true},
        {id:'91392',title:'Equilibrium Principles',desc:'Demonstrate understanding of equilibrium principles in aqueous systems',hasResource:true}
    ],
    'Biology':[
        {id:'91603',title:'Plant & Animal Responses',desc:'Demonstrate understanding of the responses of plants and animals to their external environment',hasResource:false},
        {id:'91605',title:'Evolutionary Processes',desc:'Demonstrate understanding of evolutionary processes leading to speciation',hasResource:false},
        {id:'91606',title:'Human Evolution',desc:'Demonstrate understanding of trends in human evolution',hasResource:false}
    ],
    'Statistics':[
        {id:'91584',title:'Evaluate Statistical Reports',desc:'Evaluate statistically based reports',hasResource:false},
        {id:'91585',title:'Probability Concepts',desc:'Apply probability concepts in solving problems',hasResource:false},
        {id:'91586',title:'Probability Distributions',desc:'Apply probability distributions in solving problems',hasResource:false}
    ]
};

const subjectColours = {
    'English':    { cls:'sub-english',    accent:'#b83232', bg:'#fdf3f3', light:'#fae8e7', border:'#f0c0bc' },
    'Calculus':   { cls:'sub-calculus',   accent:'#2553cc', bg:'#f0f4ff', light:'#e4ecff', border:'#bfcff5' },
    'Physics':    { cls:'sub-physics',    accent:'#5e2fb5', bg:'#f5f0fc', light:'#ebe0fb', border:'#ccb4f0' },
    'Chemistry':  { cls:'sub-chemistry',  accent:'#a85f00', bg:'#fff8ec', light:'#fdf0d0', border:'#f0d090' },
    'Biology':    { cls:'sub-biology',    accent:'#17704a', bg:'#f0faf5', light:'#d9f4e8', border:'#aee0c6' },
    'Statistics': { cls:'sub-statistics', accent:'#0a6e87', bg:'#f0fbfd', light:'#c8eef5', border:'#90d4e2' }
};

/* ─── DOM REFS ─────────────────────────── */
const appRoot     = document.getElementById('app-root');
const bcMount     = document.getElementById('backarrow-mount');
const mainContent = document.getElementById('main-content');

/* ─── ROUTER ───────────────────────────── */
function nav(view, param='') {
    if(view==='subject'){ view='notes'; }

    document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
    if(view==='home')                                                document.getElementById('sb-home').classList.add('active');
    if((view==='notes'||view==='papers'||view==='teacher') && param!=='All Subjects' && document.getElementById('sb-'+param))
                                                                     document.getElementById('sb-'+param).classList.add('active');
    if(view==='notes'   && param==='All Subjects')                   document.getElementById('sb-notes-all').classList.add('active');
    if(view==='papers'  && param==='All Subjects')                   document.getElementById('sb-papers-all').classList.add('active');
    if(view==='teacher' && param==='All Subjects')                   document.getElementById('sb-teacher-all').classList.add('active');
    if(view==='external')                                            document.getElementById('sb-External').classList.add('active');

    // Home 
    if(view==='home'){ document.body.classList.add('home-view'); renderBackArrow(false); renderHome(); }
    else {
        document.body.classList.remove('home-view');
        renderBackArrow(true);
        if     (view==='papers')  { renderNceaPastPapers(param); }
        else if(view==='notes')   { renderResourcePage('Notes',param); }
        else if(view==='teacher') { renderResourcePage('Teacher Slides',param); }
        else if(view==='external'){ renderExternal(); }
        else                      { renderGeneric(param); }
    }

    mainContent.scrollTop = 0;
    requestAnimationFrame(()=>centerInStrip(document.querySelector('.sidebar .nav-item.active')));
    appRoot.classList.remove('page-body');
    void appRoot.offsetWidth;
    appRoot.classList.add('page-body');
}

/* ─── BACK-ARROW BAR ─────────── */
function renderBackArrow(show){
    if(!show){ bcMount.innerHTML=''; return; }
    bcMount.innerHTML =
        '<div class="backarrow-bar">'+
          '<span class="back-arrow-link" role="link" tabindex="0" aria-label="Back to Home" '+
          'onclick="nav(\'home\')" onkeydown="if(event.key===\'Enter\')nav(\'home\')">'+
            '<svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">'+
              '<path class="back-arrow-icon" d="M11 3 L5 9 L11 15" /></svg>'+
          '</span>'+
          '<span class="back-arrow-label">Home</span>'+
        '</div>';
}

function centerInStrip(el){
    if(!el) return;
    const strip = el.parentElement;
    if(!strip || strip.scrollWidth <= strip.clientWidth) return;
    const offset = el.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    strip.scrollTo({ left: strip.scrollLeft + offset - (strip.clientWidth - el.offsetWidth)/2, behavior:'smooth' });
}

function noBackend(feature){ alert('Backend Required: The "'+feature+'" feature requires a file server/database to fetch and download actual NCEA documents.'); }

function resourceTabBar(subject, activeType){
    if(subject==='All Subjects') return '';
    const tabs=[
        {label:'<img class="ui-ic" src="icons/nav-notes.png" alt=""> Notes',   view:'notes',   type:'Notes'},
        {label:'<img class="ui-ic" src="icons/nav-papers.png" alt=""> Past Papers', view:'papers', type:'Past Papers'},
        {label:'<img class="ui-ic" src="icons/nav-teacher.png" alt=""> Teacher Slides', view:'teacher', type:'Teacher Slides'}
    ];
    return '<div class="resource-tab-bar" role="tablist" aria-label="Resource types">'+
        tabs.map(t=>'<div class="resource-tab '+(t.type===activeType?'active':'')+'" role="tab" aria-selected="'+(t.type===activeType)+'" tabindex="'+(t.type===activeType?'0':'-1')+'" onclick="nav(\''+t.view+'\',\''+subject+'\')">'+t.label+'</div>').join('')+
        '</div>';
}

/* ─── RENDERERS ────────────────────────── */
function renderHome(){
    appRoot.innerHTML=`
        <p style="font-size:0.9rem;color:var(--text-muted);margin-bottom:8px;">Good morning</p>
        <h1 class="page-title">What are you studying today?</h1>
        <div class="grid-3">
            ${Object.keys(subjectData).map(sub=>{
                const c = subjectColours[sub]||{accent:'var(--purple)',light:'var(--purple-light)',border:'var(--border)',cls:''};
                return `<div class="card ${c.cls}" onclick="nav('subject','${sub}')"
                    style="border-top: 3px solid ${c.border}; --hover-border:${c.border};"
                    onmouseenter="this.style.borderColor='${c.border}'"
                    onmouseleave="this.style.borderColor='${c.border}'; this.style.borderTopColor='${c.border}'">
                    <div class="icon-badge" style="background:${c.light};color:${c.accent};">${subjectData[sub].icon}</div>
                    <h4>${sub}</h4><p style="color:var(--text-muted)">Level 3</p>
                </div>`;
            }).join('')}
        </div>
        <h3 style="margin:48px 0 16px 0;font-size:1.1rem;">Quick Access</h3>
        <div class="grid-3">
            <div class="card horizontal-card" onclick="nav('notes','All Subjects')"><div class="icon-badge" style="margin:0"><img class="ui-ic" src="icons/nav-notes.png" alt=""></div><h4>All Notes</h4></div>
            <div class="card horizontal-card" onclick="nav('papers','All Subjects')"><div class="icon-badge" style="margin:0"><img class="ui-ic" src="icons/nav-papers.png" alt=""></div><h4>Past Papers</h4></div>
            <div class="card horizontal-card" onclick="nav('teacher','All Subjects')"><div class="icon-badge" style="margin:0"><img class="ui-ic" src="icons/nav-teacher.png" alt=""></div><h4>Teacher Slides</h4></div>
        </div>`;
}

function renderSubject(subject){
    const data = subjectData[subject]||{icon:'📚'};
    const c    = subjectColours[subject]||{accent:'var(--purple)',light:'var(--purple-light)',border:'var(--border)',cls:''};
    appRoot.innerHTML=`
        <div class="hero-banner ${c.cls}">
            <div class="hero-icon">${data.icon}</div>
            <div>
                <h1 style="color:${c.accent};font-size:2rem;margin-bottom:4px;">${subject}</h1>
                <p style="color:var(--text-muted)">Level 3</p>
            </div>
        </div>
        <div class="grid-2">
            <div class="card horizontal-card" style="justify-content:space-between" onclick="nav('notes','${subject}')">
                <div style="display:flex;gap:16px;align-items:center">
                    <div class="icon-badge" style="margin:0;background:${c.light};color:${c.accent};"><img class="ui-ic" src="icons/nav-notes.png" alt=""></div>
                    <div><h4>Notes</h4><p>Student summaries &amp; guides</p></div>
                </div>
                <div style="color:var(--text-muted);font-size:1.5rem">›</div>
            </div>
            <div class="card horizontal-card" style="justify-content:space-between" onclick="nav('papers','${subject}')">
                <div style="display:flex;gap:16px;align-items:center">
                    <div class="icon-badge" style="margin:0;background:${c.light};color:${c.accent};"><img class="ui-ic" src="icons/nav-papers.png" alt=""></div>
                    <div><h4>Past Papers</h4><p>Previous exams &amp; schedules</p></div>
                </div>
                <div style="color:var(--text-muted);font-size:1.5rem">›</div>
            </div>
            <div class="card horizontal-card" style="justify-content:space-between" onclick="nav('teacher','${subject}')">
                <div style="display:flex;gap:16px;align-items:center">
                    <div class="icon-badge" style="margin:0;background:${c.light};color:${c.accent};"><img class="ui-ic" src="icons/nav-teacher.png" alt=""></div>
                    <div><h4>Teacher Slides</h4><p>Lecture notes &amp; whiteboard slides</p></div>
                </div>
                <div style="color:var(--text-muted);font-size:1.5rem">›</div>
            </div>
            <div class="card horizontal-card" style="justify-content:space-between" onclick="nav('external')">
                <div style="display:flex;gap:16px;align-items:center">
                    <div class="icon-badge" style="margin:0"><img class="ui-ic" src="icons/nav-link.png" alt=""></div>
                    <div><h4>External Resources</h4><p>Verified links &amp; databases</p></div>
                </div>
                <div style="color:var(--text-muted);font-size:1.5rem">›</div>
            </div>
        </div>`;
}

function renderResourcePage(type, subject){
    const iconSrc = type==='Notes' ? 'icons/nav-notes.png' : type==='Past Papers' ? 'icons/nav-papers.png' : 'icons/nav-teacher.png';
    const icon  = '<img class="ui-ic" src="'+iconSrc+'" alt="">';
    const title = subject==='All Subjects' ? 'All '+type : type+' — '+subject;

    let contentHtml = '';

    if(subject==='All Subjects'){
        const subjects = Object.keys(resourcesDB[type]);

        const subColour = {
            'English':'sub-english', 'Calculus':'sub-calculus',
            'Physics':'sub-physics', 'Chemistry':'sub-chemistry',
            'Biology':'sub-biology', 'Statistics':'sub-statistics'
        };

        let tocHtml = '<div class="toc-sidebar"><h4>Jump to Subject</h4>';
        subjects.forEach(sub => {
            tocHtml += `<a class="toc-link" id="toc-sub-${sub}"
                onclick="scrollToId('res-sub-${sub}')"
                href="javascript:void(0)">
                ${subjectData[sub]?.icon||'📚'} ${sub}
            </a>`;
        });
        tocHtml += '</div>';
        
        let mainHtml = '';
        subjects.forEach(sub => {
            const stds    = nceaStandards[sub] || [];
            const items   = resourcesDB[type][sub] || [];
            const colCls  = subColour[sub] || '';

            const byStd = {};
            items.forEach(item => {
                if(item.standard){
                    if(!byStd[item.standard]) byStd[item.standard]=[];
                    byStd[item.standard].push(item);
                }
            });

            mainHtml += `<div class="subject-block ${colCls}" id="res-sub-${sub}">`;

            mainHtml += `<div class="subject-header-strip">
                <div class="sub-icon-badge">${subjectData[sub]?.icon||'📚'}</div>
                <div>
                    <h2>${sub}</h2>
                    <span>Level 3 ${type}</span>
                </div>
            </div>`;

            if(stds.length===0 || items.length===0){
                mainHtml += '<p style="color:var(--text-muted);font-size:0.88rem;margin-bottom:16px;">No resources available.</p>';
            } else {
                stds.forEach(std => {
                    const group = byStd[std.id] || [];
                    mainHtml += `<div class="std-group" id="res-std-${sub}-${std.id}">
                        <div class="std-group-header">
                            <span class="standard-tag">${std.id}</span>
                            <div class="std-group-title">
                                <span>${std.title}</span>
                                <span class="std-group-desc">${std.desc}</span>
                            </div>
                            <span class="std-count">${group.length} resource${group.length!==1?'s':''}</span>
                        </div>`;
                    if(group.length===0){
                        mainHtml += '<p class="std-empty">No resources yet for this standard.</p>';
                    } else {
                        mainHtml += '<div class="resource-list std-resource-list">'+group.map(item=>resourceRowHtml(item,icon)).join('')+'</div>';
                    }
                    mainHtml += '</div>';
                });
            }
            mainHtml += '</div>';
        });

        contentHtml = `
            <div class="papers-layout">
                <div class="papers-main">${mainHtml}</div>
                ${tocHtml}
            </div>`;

        appRoot.innerHTML = resourceTabBar(subject,type)+'<h1 class="page-title">'+title+'</h1>'+contentHtml;
        wireResourceToc(subjects);
        return;

    } else {
        const items   = resourcesDB[type][subject] || [];
        const stds    = nceaStandards[subject]      || [];
        const c       = subjectColours[subject]     || { cls:'', accent:'var(--purple)', light:'var(--purple-light)', border:'var(--border)' };

        const byStd = {};
        const unmatched = [];
        items.forEach(item=>{
            if(item.standard && byStd[item.standard]===undefined) byStd[item.standard]=[];
            item.standard ? byStd[item.standard].push(item) : unmatched.push(item);
        });

        if(stds.length===0 || items.length===0){
            contentHtml = items.length===0
                ? '<p style="color:var(--text-muted)">No resources found.</p>'
                : '<div class="resource-list">'+items.map(item=>resourceRowHtml(item,icon)).join('')+'</div>';
        } else {
            contentHtml += `<div class="${c.cls}">`;
            stds.forEach(std=>{
                const group = byStd[std.id] || [];
                contentHtml += `
                    <div class="std-group">
                        <div class="std-group-header">
                            <span class="standard-tag">${std.id}</span>
                            <div class="std-group-title">
                                <span>${std.title}</span>
                                <span class="std-group-desc">${std.desc}</span>
                            </div>
                            <span class="std-count">${group.length} resource${group.length!==1?'s':''}</span>
                        </div>`;
                if(group.length===0){
                    contentHtml+='<p class="std-empty">No resources yet for this standard.</p>';
                } else {
                    contentHtml+='<div class="resource-list std-resource-list">'+group.map(item=>resourceRowHtml(item,icon)).join('')+'</div>';
                }
                contentHtml+='</div>';
            });
            if(unmatched.length){
                contentHtml+=`<div class="std-group">
                    <div class="std-group-header">
                        <div class="std-group-title"><span>General Resources</span></div>
                    </div>
                    <div class="resource-list std-resource-list">${unmatched.map(item=>resourceRowHtml(item,icon)).join('')}</div>
                </div>`;
            }
            contentHtml += '</div>';
        }
    }

    appRoot.innerHTML = resourceTabBar(subject,type)+'<h1 class="page-title">'+title+'</h1>'+contentHtml;
}

function resourceRowHtml(item, icon){
    const hasUrl = item.url && item.url !== '#';
    const clickAttr = hasUrl
        ? `onclick="window.open('${item.url}','_blank','noopener,noreferrer')"`
        : `onclick="noBackend('${item.format}')"`;
    return `<div class="resource-row" ${clickAttr} role="button" tabindex="0">
        <div class="resource-row-left">
            <div class="resource-row-icon">${icon}</div>
            <div class="resource-row-text">
                <h4>${item.title}</h4>
                <p>${item.desc}</p>
            </div>
        </div>
        <span class="pill">${item.format}</span>
    </div>`;
}

const PAPER_YEARS = [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013];
const PER_YEAR_BOOKLET_STANDARDS = new Set(['91474','91584']);

function paperLink(subject, standard, year, paperType, icon){
    const links = (window.__paperLinks && window.__paperLinks[subject]) || {};
    const url = links[standard+'|'+year+'|'+paperType];
    if(url && url !== '#'){
        return '<a class="action-link" href="'+url+'" target="_blank" rel="noopener noreferrer">'+icon+' '+paperType+'</a>';
    }
    return '<div class="action-link action-link-empty" onclick="noBackend(\''+paperType+'\')">'+icon+' '+paperType+'</div>';
}

function renderNceaPastPapers(subjectFilter){
    const title = subjectFilter==='All Subjects' ? 'NCEA Level 3 Past Papers' : 'Level 3 '+subjectFilter+' Past Papers';
    let subjectsToRender = subjectFilter==='All Subjects' ? Object.keys(nceaStandards) : [subjectFilter];
    let contentHtml='', tocHtml='';
    if(subjectFilter==='All Subjects'){
        tocHtml='<div class="toc-sidebar"><h4>Jump to Subject</h4>'+
            subjectsToRender.map(sub=>{
                return '<a class="toc-link" id="toc-sub-'+sub+'" onclick="scrollToId(\'subject-'+sub+'\')" href="javascript:void(0)">'+
                    (subjectData[sub]?.icon||'📚')+' '+sub+'</a>';
            }).join('')+
            '</div>';
    }
    subjectsToRender.forEach(sub=>{
        const data = subjectData[sub]||{icon:'📚'};
        const c    = subjectColours[sub]||{cls:'',accent:'var(--purple)',light:'var(--purple-light)',border:'var(--border)'};
        let tableRowsHtml='';
        nceaStandards[sub].forEach(std=>{
            tableRowsHtml+=`<tr class="table-group-header"><td colspan="2"><span class="standard-tag">${std.id}</span> – ${std.title}<div style="font-size:0.85rem;color:var(--text-muted);font-weight:400;margin-top:4px;">${std.desc}</div></td></tr>`;
            const isPerYearBooklet = PER_YEAR_BOOKLET_STANDARDS.has(std.id);
            if(!isPerYearBooklet){
                const formulae = paperLink(sub, std.id, 'ALL', 'Formulae Booklet', '<img class="ui-ic" src="icons/nav-notes.png" alt="">');
                tableRowsHtml+=`<tr class="booklet-row"><td class="year-cell" style="width:15%;"></td><td class="links-cell"><div class="action-links">${formulae}</div></td></tr>`;
            }
            PAPER_YEARS.forEach(year=>{
                const exam = paperLink(sub, std.id, year, 'Examination Paper', '<img class="ui-ic" src="icons/nav-papers.png" alt="">');
                const sched= paperLink(sub, std.id, year, 'Assessment Schedule', '<img class="ui-ic" src="icons/clipboard.png" alt="">');
                const booklet = isPerYearBooklet ? paperLink(sub, std.id, year, 'Resource Booklet', '<img class="ui-ic" src="icons/nav-notes.png" alt="">') : '';
                tableRowsHtml+=`<tr><td class="year-cell" style="font-weight:500;width:15%;font-size:1.1rem;">${year}</td><td class="links-cell"><div class="action-links">${exam}${sched}${booklet}</div></td></tr>`;
            });
        });
        contentHtml+=`<div class="card card-static ${c.cls}" id="subject-${sub}">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
                <div class="icon-badge" style="margin:0;width:48px;height:48px;font-size:1.5rem;background:${c.light};color:${c.accent};">${data.icon}</div>
                <div>
                    <h2 style="font-size:1.5rem;font-weight:600;color:${c.accent};">${sub}</h2>
                    <span style="font-size:0.8rem;color:var(--text-muted);">Level 3</span>
                </div>
            </div>
            <div class="table-container"><table><tbody>${tableRowsHtml}</tbody></table></div>
        </div>`;
    });
    appRoot.innerHTML=
        resourceTabBar(subjectFilter,'Past Papers')+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">'+title+'</h1></div>'+
        '<div class="card horizontal-card card-static" style="padding:16px;margin-bottom:32px;"><div class="icon-badge" style="margin:0;background:#fef3c7;color:#d97706;"><img class="ui-ic" src="icons/lightbulb.png" alt=""></div><p style="font-size:0.95rem;margin:0;"><strong>Tip:</strong> Use these past exams to test yourself under timed conditions.</p></div>'+
        '<div class="'+(subjectFilter==='All Subjects'?'papers-layout':'')+'">'+
        '<div class="'+(subjectFilter==='All Subjects'?'papers-main':'')+'">'+contentHtml+'</div>'+ tocHtml +'</div>';
    if(subjectFilter==='All Subjects') wirePapersToc(subjectsToRender);
}

function renderExternal(){
    appRoot.innerHTML=`
        <h1 class="page-title">External Hub</h1>
        <div class="grid-3">
            <div class="card" onclick="window.open('https://www.nzqa.govt.nz/','_blank')"><div class="icon-badge">🌐</div><h4>NZQA Official</h4></div>
            <div class="card" onclick="window.open('https://studytime.co.nz/','_blank')"><div class="icon-badge">⏱️</div><h4>StudyTime NZ</h4></div>
            <div class="card" onclick="window.open('https://www.nobraintoosmall.co.nz/','_blank')"><div class="icon-badge">🧠</div><h4>No Brain Too Small</h4></div>
        </div>`;
}

function renderGeneric(param){
    appRoot.innerHTML='<h1 class="page-title">'+param+'</h1><p style="color:var(--text-muted);">This section is under construction.</p>';
}

function scrollToId(id){
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

let _tocObserver = null;

function _buildObserver(anchors, tocIdFn){
    if(_tocObserver){ _tocObserver.disconnect(); _tocObserver=null; }
    const scrollRoot = document.getElementById('main-content');
    _tocObserver = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
            const sub = entry.target.dataset.subject;
            const el  = document.getElementById(tocIdFn(sub));
            if(!el) return;
            const c = subjectColours[sub]||{accent:'var(--purple)',bg:'var(--purple-light)',border:'var(--purple-mid)'};
            if(entry.isIntersecting){
                el.classList.add('toc-active');
                el.style.color           = c.accent;
                el.style.background      = c.bg;
                el.style.borderLeftColor = c.accent;
                centerInStrip(el);
            } else {
                el.classList.remove('toc-active');
                el.style.color = el.style.background = el.style.borderLeftColor = '';
            }
        });
    },{ root: scrollRoot, rootMargin: '-8% 0px -62% 0px', threshold: 0 });
    anchors.forEach(el=>{ if(el) _tocObserver.observe(el); });
}

function wireResourceToc(subjects){
    const anchors = subjects.map(sub=>{
        const el = document.getElementById('res-sub-'+sub);
        if(el) el.dataset.subject = sub;
        return el;
    });
    _buildObserver(anchors, sub=>'toc-sub-'+sub);
}

function wirePapersToc(subjects){
    const anchors = subjects.map(sub=>{
        const el = document.getElementById('subject-'+sub);
        if(el) el.dataset.subject = sub;
        return el;
    });
    _buildObserver(anchors, sub=>'toc-sub-'+sub);
}

/* ─── TOP-NAV DROPDOWN TOGGLE ──────────── */
(function(){
    const toggle = document.getElementById('subjectsToggle');
    const dropdown = document.getElementById('subjectsDropdown');
    if(!toggle||!dropdown) return;
    toggle.addEventListener('click',(e)=>{ e.stopPropagation();
        const open = dropdown.classList.toggle('open');
        toggle.classList.toggle('open',open);
        toggle.setAttribute('aria-expanded',open);
    });
    document.addEventListener('click',(e)=>{
        if(!dropdown.contains(e.target)&&e.target!==toggle){
            dropdown.classList.remove('open'); toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded','false');
        }
    });
    document.addEventListener('keydown',(e)=>{
        if(e.key==='Escape'){ dropdown.classList.remove('open'); toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded','false'); }
    });
    // Close the dropdown after picking a subject.
    dropdown.querySelectorAll('.drop-item').forEach(it=>it.addEventListener('click',()=>{
        dropdown.classList.remove('open'); toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
    }));
})();

/* ─── BOOT ─────────────────────────────── */
(async function boot(){
    try { await loadResourcesFromSupabase(); }
    catch(err){ console.error('Could not load resources from Supabase:', err); }
    nav('home');
})();