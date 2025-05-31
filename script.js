document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('pokemon-table-body');
  const nameInput = document.getElementById('search-input');
  const nameDropdown = document.getElementById('search-dropdown');
  const ingInput = document.getElementById('search-ing-input');
  const ingDropdown = document.getElementById('search-ing-dropdown');
  const ticketCheckbox = document.getElementById('ticket-checkbox');
  const oteboDropdown = document.getElementById('otebo-dropdown');
  let pokemonData = [];

  function renderTable(data) {
    tableBody.innerHTML = '';
    data.forEach(entry => {
      const tr = document.createElement('tr');
      ['name','ing','amount','level','help_speed','ing_percent'].forEach(key => {
        const td = document.createElement('td');
        td.textContent = entry[key];
        tr.appendChild(td);
      });
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
    // After filtering, default sort by 1時間取得回数 (column index 8) descending
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const vA = parseFloat(a.cells[8].textContent) || 0;
      const vB = parseFloat(b.cells[8].textContent) || 0;
      return vB - vA;
    });
    rows.forEach(r => tableBody.appendChild(r));
  }
  // Listen to dropdown change as well
  nameDropdown.addEventListener('change', applyFilter);
  ingDropdown.addEventListener('change', applyFilter);

  // Add sorting on header click
  const columns = ['name','ing','amount','level','help_speed','ing_percent', 'actual_speed', 'hour_count'];
  let currentSort = { key: null, direction: 1 };
  const headers = document.querySelectorAll('#pokemon-table thead th');
  headers.forEach((th, index) => {
    th.style.cursor = 'pointer';
    const key = columns[index];
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
  // Add sorting on 1時間取得回数 column (index 8) by direct DOM row sort
  let hourSortDir = 1;
  const hourTh = document.querySelectorAll('#pokemon-table thead th')[8];
  hourTh.style.cursor = 'pointer';
  hourTh.addEventListener('click', () => {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const vA = parseFloat(a.cells[8].textContent) || 0;
      const vB = parseFloat(b.cells[8].textContent) || 0;
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
      pokemonData = data;
      // populate dropdowns using fetched data
      const names = Array.from(new Set(pokemonData.map(e => e.name))).sort();
      names.forEach(name => {
        const opt = document.createElement('option'); opt.value = name; opt.textContent = name;
        nameDropdown.appendChild(opt);
      });
      // populate ingredient dropdown
      const ings = Array.from(new Set(pokemonData.map(e => e.ing))).sort();
      ings.forEach(ing => {
        const opt = document.createElement('option'); opt.value = ing; opt.textContent = ing;
        ingDropdown.appendChild(opt);
      });
      renderTable(pokemonData);
      // Default sort by 1時間取得回数 (column index 8) descending
      const initialRows = Array.from(tableBody.querySelectorAll('tr'));
      initialRows.sort((a, b) => {
        const vA = parseFloat(a.cells[8].textContent) || 0;
        const vB = parseFloat(b.cells[8].textContent) || 0;
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
});
