import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface ExportData {
    stats: any
    earningsData: any[]
    expensesData: any[]
    progressData: any[]
    chartImages: {
        earnings: string
        expenses: string
        progress: string
    }
}

export const generateExcelReport = async (data: ExportData) => {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Sistema Control Terminaciones'
    workbook.created = new Date()

    // --- SHEET 1: Resumen Gráfico ---
    const summarySheet = workbook.addWorksheet('Resumen Gráfico', {
        views: [{ showGridLines: false }]
    })

    // Title
    summarySheet.mergeCells('B2:H2')
    const titleCell = summarySheet.getCell('B2')
    titleCell.value = 'Reporte Financiero y de Progreso'
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // slate-900 like
    }
    titleCell.alignment = { horizontal: 'center' }

    // Stats Table
    const statsHeaders = ['Métrica', 'Valor', 'Cambio', 'Descripción']
    const statsRows = [
        ['Ganancias Generales', data.stats.totalEarnings, data.stats.earningsChange, 'Ingresos totales del mes'],
        ['Ganancias Contratista', data.stats.contractorEarnings, data.stats.contractorChange, 'Beneficios del contratista'],
        ['Pagos Trabajadores', data.stats.workerPayments, data.stats.workerChange, 'Salarios y bonificaciones'],
        ['Gastos Realizados', data.stats.totalExpenses, data.stats.expensesChange, 'Gastos operacionales']
    ]

    summarySheet.getCell('B4').value = 'Métricas Clave'
    summarySheet.getCell('B4').font = { bold: true, size: 12 }

    // Header Row
    statsHeaders.forEach((header, index) => {
        const cell = summarySheet.getCell(5, 2 + index)
        cell.value = header
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF334155' } // slate-700
        }
        cell.border = { bottom: { style: 'thin' } }
    })

    // Data Rows
    statsRows.forEach((row, rowIndex) => {
        row.forEach((val, colIndex) => {
            const cell = summarySheet.getCell(6 + rowIndex, 2 + colIndex)
            cell.value = val

            // Formatting
            if (colIndex === 1) cell.numFmt = '"$"#,##0'
            if (colIndex === 2) cell.numFmt = '0.0"%"'
        })
    })

    // Images
    const insertImage = (base64: string, range: string) => {
        if (!base64) return
        const imageId = workbook.addImage({
            base64: base64,
            extension: 'png',
        })
        summarySheet.addImage(imageId, range)
    }

    // Monthly Earnings Image
    summarySheet.getCell('B12').value = 'Ganancias Mensuales'
    summarySheet.getCell('B12').font = { bold: true }
    if (data.chartImages.earnings) {
        insertImage(data.chartImages.earnings, 'B13:H25')
    }

    // Monthly Expenses Image
    summarySheet.getCell('B27').value = 'Gastos Mensuales'
    summarySheet.getCell('B27').font = { bold: true }
    if (data.chartImages.expenses) {
        insertImage(data.chartImages.expenses, 'B28:H40')
    }

    // Monthly Progress Image
    summarySheet.getCell('B42').value = 'Progreso de Proyectos'
    summarySheet.getCell('B42').font = { bold: true }
    if (data.chartImages.progress) {
        insertImage(data.chartImages.progress, 'B43:H55')
    }

    // --- SHEET 2: Detalles (Data) ---
    const detailSheet = workbook.addWorksheet('Detalles de Datos')

    // Earnings Table
    detailSheet.getCell('A1').value = 'Detalle de Ganancias'
    detailSheet.getCell('A1').font = { bold: true, size: 14 }

    const earningsTable = detailSheet.addTable({
        name: 'EarningsTable',
        ref: 'A3',
        headerRow: true,
        totalsRow: true,
        style: {
            theme: 'TableStyleMedium2',
            showRowStripes: true,
        },
        columns: [
            { name: 'Mes', filterButton: true },
            { name: 'Total Ganancias', totalsRowFunction: 'sum' },
            { name: 'Ganancia Contratista', totalsRowFunction: 'sum' },
            { name: 'Pagos Trabajadores', totalsRowFunction: 'sum' },
        ],
        rows: data.earningsData.map(d => [d.month, d.totalEarnings, d.contractorEarnings, d.workerPayments])
    })

    // Expenses Table
    const expensesStartRow = data.earningsData.length + 8
    detailSheet.getCell(`A${expensesStartRow}`).value = 'Detalle de Gastos'
    detailSheet.getCell(`A${expensesStartRow}`).font = { bold: true, size: 14 }

    detailSheet.addTable({
        name: 'ExpensesTable',
        ref: `A${expensesStartRow + 2}`,
        headerRow: true,
        totalsRow: true,
        style: {
            theme: 'TableStyleMedium4',
            showRowStripes: true,
        },
        columns: [
            { name: 'Mes', filterButton: true },
            { name: 'Gastos Totales', totalsRowFunction: 'sum' },
            { name: 'Materiales', totalsRowFunction: 'sum' },
            { name: 'Mano de Obra', totalsRowFunction: 'sum' },
            { name: 'Operacionales', totalsRowFunction: 'sum' },
        ],
        rows: data.expensesData.map(d => [
            d.month,
            d.totalExpenses,
            d.materialCosts,
            d.laborCosts,
            d.operationalCosts
        ])
    })

    // Adjust Column Widths
    summarySheet.columns.forEach(col => { col.width = 15 })
    summarySheet.getColumn(2).width = 25 // Metric name
    summarySheet.getColumn(5).width = 30 // Description

    detailSheet.columns.forEach(col => { col.width = 20 })

    // Write File
    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer]), `Reporte_Financiero_${new Date().toISOString().split('T')[0]}.xlsx`)
}
