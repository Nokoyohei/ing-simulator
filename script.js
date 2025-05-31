document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('pokemon-table-body');
  const nameInput = document.getElementById('search-input');
  const nameDropdown = document.getElementById('search-dropdown');
  const ingInput = document.getElementById('search-ing-input');
  const ingDropdown = document.getElementById('search-ing-dropdown');
  const ticketCheckbox = document.getElementById('ticket-checkbox');
  const oteboDropdown = document.getElementById('otebo-dropdown');
  let originalData = [];
  let addedData = JSON.parse(localStorage.getItem('addedPokemon') || '[]');
  let pokemonData = [];

  // Add/Edit modal elements
  const addBtn = document.getElementById('add-btn');
  const modal = document.getElementById('add-modal');
  const closeBtn = modal.querySelector('.close');
  const formName = document.getElementById('form-name');
  const formIng = document.getElementById('form-ing');
  const formAmount = document.getElementById('form-amount');
  const formLevel = document.getElementById('form-level');
  const formIngPercent = document.getElementById('form-ing_percent');
  const formHelpSpeed = document.getElementById('form-help_speed');
  const formOtebo = document.getElementById('form-otebo');
  const formSpM = document.getElementById('form-spM');
  const formSpS = document.getElementById('form-spS');
  const formIngS = document.getElementById('form-ingS');
  const formIngM = document.getElementById('form-ingM');
  const formNature = document.getElementById('form-nature');
  const saveBtn = document.getElementById('save-btn');
  let isEditing = false, editingIndex = null;

  function renderTable(data) {
    tableBody.innerHTML = '';
    data.forEach((entry, index) => {
      const tr = document.createElement('tr');
      if (!entry._orig) tr.classList.add('new-entry');
      ['name','ing','amount','level','help_speed','ing_percent'].forEach(key => {
        const td = document.createElement('td');
        td.textContent = entry[key];
        tr.appendChild(td);
      });
      // placeholder cells for new columns to match header order
      for (let i = 0; i < 6; i++) {
        const td = document.createElement('td');
        td.textContent = '-';
        tr.appendChild(td);
      }
      // append average swap count with level-specific multiplier
      const tdAvg = document.createElement('td');
      const percent = parseFloat(entry.ing_percent);
      const lvl = parseFloat(entry.level);
      // apply multiplier: lvl30 -> half, lvl60 -> one-third
      let effPercent = percent;
      if (lvl === 30) effPercent = percent * 0.5;
      else if (lvl === 60) effPercent = percent / 3;
      const avgSwapCount = effPercent > 0 ? 100 / effPercent : 0;
      tdAvg.textContent = avgSwapCount.toFixed(2);
      tr.appendChild(tdAvg);
      // append actual support speed: help_speed * (1 - (level-1)*0.002) * 0.45
      const tdActual = document.createElement('td');
      const helpSpeed = parseFloat(entry.help_speed);
      const level = parseFloat(entry.level);
      let actual = helpSpeed * (1 - (level - 1) * 0.002) * 0.45;
      // apply キャンチケ discount if checked
      if (ticketCheckbox && ticketCheckbox.checked) {
        actual = actual / 1.2;
      }
      // apply おてぼ multiplier
      const oteboCount = oteboDropdown ? parseInt(oteboDropdown.value, 10) : 0;
      actual = actual * (1 - 0.07 * oteboCount);
      tdActual.textContent = !isNaN(actual) ? actual.toFixed(2) : '';
      tr.appendChild(tdActual);
      // append 1時間取得回数 using adjusted avgSwapCount
      const tdHour = document.createElement('td');
      const amountCount = parseFloat(entry.amount);
      const denom = actual + avgSwapCount * 5;
      const hourCount = denom > 0 ? (3600 / denom) * amountCount : 0;
      tdHour.textContent = !isNaN(hourCount) ? hourCount.toFixed(2) : '';
      tr.appendChild(tdHour);
      // operation buttons: only for added entries
      const tdOp = document.createElement('td');
      if (!entry._orig) {
        const editBtnRow = document.createElement('button'); editBtnRow.textContent = '編集';
        editBtnRow.addEventListener('click', () => {
          isEditing = true; editingIndex = index; showModal();
          formName.value = entry.name; formName.dispatchEvent(new Event('change'));
          formIng.value = entry.ing; formAmount.value = entry.amount;
          formLevel.value = entry.level; formHelpSpeed.value = entry.help_speed;
          formIngPercent.value = entry.ing_percent;
          formOtebo.checked = entry.otebo; formSpM.checked = entry.spM;
          formSpS.checked = entry.spS; formIngS.checked = entry.ingS;
          formIngM.checked = entry.ingM; formNature.value = entry.nature;
        });
        const delBtnRow = document.createElement('button'); delBtnRow.textContent = '削除';
        delBtnRow.addEventListener('click', () => {
          // remove this entry from addedData by matching unique properties
          const idx = addedData.findIndex(e =>
            e.name === entry.name && e.ing === entry.ing && e.amount === entry.amount && e.level === entry.level
            && e.help_speed === entry.help_speed && e.ing_percent === entry.ing_percent
          );
          if (idx > -1) {
            addedData.splice(idx, 1);
          }
          // persist updated storage
          localStorage.setItem('addedPokemon', JSON.stringify(addedData));
          // re-merge data and refresh
          pokemonData = originalData.concat(addedData);
          applyFilter();
        });
        tdOp.append(editBtnRow, delBtnRow);
      }
      tr.appendChild(tdOp);
      tableBody.appendChild(tr);
    });
  }

  // Apply filtering whenever either input changes
  function applyFilter() {
    const nameTerm = nameInput.value.trim();
    const dropdownTerm = nameDropdown.value;
    const ingTerm = ingInput.value.trim();
    const dropdownIng = ingDropdown.value;
    const filtered = pokemonData.filter(entry =>
      (dropdownTerm === '' || entry.name === dropdownTerm) &&
      (nameTerm === '' || entry.name.includes(nameTerm)) &&
      (dropdownIng === '' || entry.ing === dropdownIng) &&
      (ingTerm === '' || entry.ing.includes(ingTerm))
    );
    renderTable(filtered);
    // After filtering, default sort by 1時間取得回数 (column index 14) descending
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const vA = parseFloat(a.cells[14].textContent) || 0;
      const vB = parseFloat(b.cells[14].textContent) || 0;
      return vB - vA;
    });
    rows.forEach(r => tableBody.appendChild(r));
  }
  // Listen to dropdown change as well
  nameDropdown.addEventListener('change', applyFilter);
  ingDropdown.addEventListener('change', applyFilter);

  // Add sorting on header click for first six data columns
  const columns = ['name','ing','amount','level','help_speed','ing_percent'];
  let currentSort = { key: null, direction: 1 };
  const headers = document.querySelectorAll('#pokemon-table thead th');
  headers.forEach((th, index) => {
    const key = columns[index];
    if (!key) return;
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      if (currentSort.key === key) currentSort.direction *= -1;
      else { currentSort.key = key; currentSort.direction = 1; }
      pokemonData.sort((a, b) => {
        let aval = a[key], bval = b[key];
        if (['amount','level','help_speed','ing_percent'].includes(key)) {
          aval = parseFloat(aval); bval = parseFloat(bval);
        }
        if (aval < bval) return -currentSort.direction;
        if (aval > bval) return currentSort.direction;
        return 0;
      });
      applyFilter();
    });
  });

  // Add sorting on 1時間取得回数 column (new index 14) by direct DOM row sort
  let hourSortDir = 1;
  const hourTh = document.querySelectorAll('#pokemon-table thead th')[14];
  hourTh.style.cursor = 'pointer';
  hourTh.addEventListener('click', () => {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const vA = parseFloat(a.cells[14].textContent) || 0;
      const vB = parseFloat(b.cells[14].textContent) || 0;
      return hourSortDir * (vA - vB);
    });
    rows.forEach(r => tableBody.appendChild(r));
    hourSortDir *= -1;
  });

  nameInput.addEventListener('input', applyFilter);
  ingInput.addEventListener('input', applyFilter);
  ticketCheckbox.addEventListener('change', applyFilter);
  oteboDropdown.addEventListener('change', applyFilter);

  fetch('./data/pokemon_data.json')
    .then(response => {
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
      return response.json();
    })
    .then(data => {
      // flag originals
      originalData = data.map(item => Object.assign({}, item, { _orig: true }));
      // merge original and added entries
      pokemonData = originalData.concat(addedData);
      // populate dropdowns using fetched data
      const names = Array.from(new Set(originalData.map(e => e.name))).sort();
      names.forEach(name => {
        const opt = document.createElement('option'); opt.value = name; opt.textContent = name;
        nameDropdown.appendChild(opt);
      });
      // populate ingredient dropdown
      const ings = Array.from(new Set(originalData.map(e => e.ing))).sort();
      ings.forEach(ing => {
        const opt = document.createElement('option'); opt.value = ing; opt.textContent = ing;
        ingDropdown.appendChild(opt);
      });
      renderTable(pokemonData);
      // Default sort by 1時間取得回数 (column index 14) descending
      const initialRows = Array.from(tableBody.querySelectorAll('tr'));
      initialRows.sort((a, b) => {
        const vA = parseFloat(a.cells[14].textContent) || 0;
        const vB = parseFloat(b.cells[14].textContent) || 0;
        return vB - vA;
      });
      initialRows.forEach(r => tableBody.appendChild(r));
    })
    .catch(error => {
      console.error('Error fetching or parsing JSON:', error);
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'データの読み込みに失敗しました';
      tr.appendChild(td);
      tableBody.appendChild(tr);
    });

   function showModal() {
     modal.classList.remove('hidden');
     formName.innerHTML = '<option value="">-- 選択 --</option>';
     Array.from(new Set(originalData.map(e => e.name))).sort().forEach(name => {
       const opt = document.createElement('option'); opt.value = name; opt.textContent = name;
       formName.appendChild(opt);
     });
     formIng.innerHTML = '<option value="">-- 選択 --</option>';
     formAmount.innerHTML = '<option value="">-- 選択 --</option>';
     formLevel.value = 30;
     formIngPercent.value = '';
     formHelpSpeed.value = '';
     [formOtebo, formSpM, formSpS, formIngS, formIngM].forEach(cb => cb.checked = false);
     formNature.value = 'sp_up';
   }
   function hideModal() { modal.classList.add('hidden'); }
   addBtn.addEventListener('click', () => { isEditing = false; editingIndex = null; showModal(); });
   closeBtn.addEventListener('click', hideModal);
   modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });
   formName.addEventListener('change', () => {
     const selName = formName.value;
     const related = pokemonData.filter(e => e.name === selName);
     // ing options
     formIng.innerHTML = '<option value="">-- 選択 --</option>';
     Array.from(new Set(related.map(e => e.ing))).sort().forEach(ing => {
       const opt = document.createElement('option'); opt.value = ing; opt.textContent = ing; formIng.appendChild(opt);
     });
     // amount options
     formAmount.innerHTML = '<option value="">-- 選択 --</option>';
     Array.from(new Set(related.map(e => e.amount))).sort((a,b)=>a-b).forEach(a=>{
       const opt = document.createElement('option'); opt.value = a; opt.textContent = a; formAmount.appendChild(opt);
     });
     // auto fill defaults
     if (related.length) {
       formHelpSpeed.value = related[0].help_speed;
       formIngPercent.value = related[0].ing_percent;
     }
   });
   saveBtn.addEventListener('click', () => {
     const entry = {
        name: formName.value,
        ing: formIng.value,
        amount: formAmount.value,
        level: formLevel.value,
        help_speed: formHelpSpeed.value,
        ing_percent: formIngPercent.value,
        otebo: formOtebo.checked,
        spM: formSpM.checked,
        spS: formSpS.checked,
        ingS: formIngS.checked,
        ingM: formIngM.checked,
        nature: formNature.value
     };
    if (isEditing && editingIndex != null && editingIndex >= originalData.length) {
      // edit added entry
      const idx = editingIndex - originalData.length;
      addedData[idx] = entry;
    } else {
      // new entry
      addedData.push(entry);
    }
    // persist
    localStorage.setItem('addedPokemon', JSON.stringify(addedData));
    // re-merge and refresh
    pokemonData = originalData.concat(addedData);
    // clear search filters so the new entry appears
    nameInput.value = '';
    nameDropdown.value = '';
    ingInput.value = '';
    ingDropdown.value = '';
     hideModal();
     applyFilter();
   });
});
