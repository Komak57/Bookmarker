function render() {
    const contentDiv = document.getElementById('optionsList');
    contentDiv.textContent = ``;

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
    contentDiv.appendChild(exportButton);

    const importInput = document.createElement('input');
    importInput.type = "file";
    importInput.id = 'fileInput';
    importInput.accept = 'csv';
    contentDiv.appendChild(importInput);

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
    contentDiv.appendChild(importButton);
}
// Load the list of tracked domains when the page loads
document.addEventListener('DOMContentLoaded', render);