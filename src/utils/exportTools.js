export async function loadExportTools() {
  const [{ jsPDF }, autoTableModule, XLSX] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('xlsx'),
  ]);
  return {
    jsPDF,
    autoTable: autoTableModule.default || autoTableModule.autoTable,
    XLSX,
  };
}
