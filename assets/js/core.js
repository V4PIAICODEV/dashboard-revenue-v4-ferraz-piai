// Estado Global do Filtro
const GlobalFilter = {
    startDate: null,
    endDate: null,
    sdrId: 'all',
    channelId: 'all'
};

let datePickerInstance = null;

function formatDateToInput(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
}

function formatDateBr(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function initializeDateFilterComponent() {
    const display = document.getElementById('dateDisplay');
    const popover = document.getElementById('datePopover');
    const applyBtn = document.getElementById('applyDateBtn');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const sdrSelect = document.getElementById('sdrFilter');
    const channelSelect = document.getElementById('channelFilter');
    const info = document.getElementById('selectionInfo');

    if(!display) return;

    // Configurar Flatpickr
    datePickerInstance = flatpickr("#inlineCalendar", {
        mode: "range",
        inline: true,
        dateFormat: "Y-m-d",
        showMonths: 1,
        locale: "pt",
        monthSelectorType: 'static', // <--- ALTERAÇÃO AQUI: Remove o dropdown e deixa estático
        onChange: function(selectedDates) {
            if (selectedDates.length > 0) presetBtns.forEach(btn => btn.classList.remove('active'));
            if (selectedDates.length === 2) {
                info.textContent = `${formatDateBr(formatDateToInput(selectedDates[0]))} até ${formatDateBr(formatDateToInput(selectedDates[1]))}`;
            } else if (selectedDates.length === 1) {
                const s = formatDateToInput(selectedDates[0]);
                info.textContent = `${formatDateBr(s)} (Selecione o fim)`;
            }
        }
    });

    // Padrão: Este Mês
    setPresetRange('month');
    updateDisplayLabel(); 

    // Toggle Popover
    display.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = (window.getComputedStyle(popover).display === 'none');
        if (isHidden) {
            popover.style.display = 'flex';
            display.classList.add('active');
            // Sync info label quando abre
            if (datePickerInstance && datePickerInstance.selectedDates.length > 0) {
                const s = datePickerInstance.selectedDates[0];
                const e2 = datePickerInstance.selectedDates[1] || s;
                info.textContent = `${formatDateBr(formatDateToInput(s))} até ${formatDateBr(formatDateToInput(e2))}`;
            }
        } else {
            popover.style.display = 'none';
            display.classList.remove('active');
        }
    });

    document.addEventListener('click', (e) => {
        if (!display.contains(e.target) && !popover.contains(e.target)) {
            popover.style.display = 'none';
            display.classList.remove('active');
        }
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setPresetRange(btn.dataset.range);
        });
    });

    applyBtn.addEventListener('click', () => {
        const selectedDates = datePickerInstance.selectedDates;
        if (selectedDates.length > 0) {
            GlobalFilter.startDate = formatDateToInput(selectedDates[0]);
            GlobalFilter.endDate = formatDateToInput(selectedDates[1] || selectedDates[0]);
            
            updateDisplayLabel();
            
            popover.style.display = 'none';
            display.classList.remove('active');
            
            if(typeof renderAll === 'function') renderAll();
        }
    });

    if (sdrSelect) sdrSelect.addEventListener('change', (e) => { GlobalFilter.sdrId = e.target.value; if(typeof renderAll === 'function') renderAll(); });
    if (channelSelect) channelSelect.addEventListener('change', (e) => { GlobalFilter.channelId = e.target.value; if(typeof renderAll === 'function') renderAll(); });

    document.addEventListener('change', (e) => {
        if(e.target && e.target.id === 'burnupGranularity') {
            console.log("Granularidade:", e.target.value);
            if(typeof renderExecutiveView === 'function') renderExecutiveView();
        }
    });
}

function setPresetRange(rangeKey) {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (rangeKey === 'today') { /* ... */ }
    else if (rangeKey === 'yesterday') {
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
    } else if (rangeKey === '7') {
        start.setDate(today.getDate() - 6);
    } else if (rangeKey === '15') {
        start.setDate(today.getDate() - 14);
    } else if (rangeKey === '30') {
        start.setDate(today.getDate() - 29);
    } else if (rangeKey === 'month') {
        start.setDate(1); 
    }

    GlobalFilter.startDate = formatDateToInput(start);
    GlobalFilter.endDate = formatDateToInput(end);

    if(datePickerInstance) datePickerInstance.setDate([start, end]);
    
    const info = document.getElementById('selectionInfo');
    if(info) info.textContent = `${formatDateBr(formatDateToInput(start))} até ${formatDateBr(formatDateToInput(end))}`;
}

function updateDisplayLabel() {
    const txt = document.getElementById('dateRangeText');
    const activePreset = document.querySelector('.preset-btn.active');
    const s = formatDateBr(GlobalFilter.startDate);
    const e = formatDateBr(GlobalFilter.endDate);

    if (activePreset) {
        txt.textContent = `${activePreset.textContent} (${s.slice(0,5)} - ${e.slice(0,5)})`;
    } else {
        txt.textContent = `${s} - ${e}`;
    }
}

// Utils
function getBadgeClassPA(val) { return val < 20 ? 'red' : (val < 40 ? 'yellow' : 'green'); }
function getBadgeClassAR(val) { return val < 70 ? 'red' : (val < 90 ? 'yellow' : 'green'); }