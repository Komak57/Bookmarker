function render() {
    const contentDiv = document.getElementById('optionsList');
    contentDiv.textContent = ``;

    const _groupCSV = document.createElement('div');
    _groupCSV.classList.add('settings-group');

    const _groupExportPair = document.createElement('div');
    _groupExportPair.classList.add('settings-pair');

    const exportButton = document.createElement('button');
    // exportButton.className = 'fas fa-solid fa-file-export';
    exportButton.textContent = 'Export as CSV';

    exportButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        exportAsCSV();
        // window.location.reload(); // Force full page reload of popup.html
        // TODO: listen for background message to reload page
    });
    _groupExportPair.appendChild(exportButton);
    _groupCSV.appendChild(_groupExportPair);

    const _groupImportPair = document.createElement('div');
    _groupImportPair.classList.add('settings-pair');

    const importInput = document.createElement('input');
    importInput.classList.add('centerred');
    importInput.type = "file";
    importInput.id = 'fileInput';
    importInput.accept = 'csv';
    _groupImportPair.appendChild(importInput);

    const importButton = document.createElement('button');
    importButton.textContent = 'Import File';

    importButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();

        const file = importInput.files[0];
        importCSV(file);
        // window.location.reload(); // Force full page reload of popup.html
        // TODO: listen for background message to reload page
    });
    _groupImportPair.appendChild(importButton);
    _groupCSV.appendChild(_groupImportPair);
    contentDiv.appendChild(_groupCSV);
}
// Load the list of tracked domains when the page loads
document.addEventListener('DOMContentLoaded', render);