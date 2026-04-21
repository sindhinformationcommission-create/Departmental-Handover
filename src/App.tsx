import { useState } from 'react';
import { Download, Plus, Trash2, Edit2, Check, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INITIAL_DATA } from './initialData';
import { Department, Office } from './types';

type ColumnType = 'srNo' | 'name' | 'offices' | 'officialName' | 'jobDescription';

interface ColumnDef {
  id: ColumnType;
  label: string;
}

export default function App() {
  const [data, setData] = useState<Department[]>(INITIAL_DATA);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Department | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [columnOrder, setColumnOrder] = useState<ColumnDef[]>([
    { id: 'srNo', label: 'SR.' },
    { id: 'name', label: 'Sector / Department' },
    { id: 'offices', label: 'Attached Office/Org / Focal Person' },
    { id: 'officialName', label: 'Official' },
    { id: 'jobDescription', label: 'JD' },
  ]);

  const moveColumn = (index: number, direction: 'left' | 'right') => {
    const newOrder = [...columnOrder];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setColumnOrder(newOrder);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    
    doc.setFontSize(18);
    doc.text('Departmental Handover List', 40, 40);

    // Define the columns specifically for the PDF to split the grouped UID column
    const pdfColumnDefs: { id: string; label: string }[] = [];
    columnOrder.forEach(col => {
      if (col.id === 'offices') {
        pdfColumnDefs.push({ id: 'offices_name', label: 'Attached Office / Org' });
        pdfColumnDefs.push({ id: 'offices_focal', label: 'Focal Person' });
      } else {
        pdfColumnDefs.push({ id: col.id, label: col.label });
      }
    });

    const tableData: any[] = [];
    data.forEach((dept) => {
      const officeCount = Math.max(dept.offices.length, 1);
      
      for (let i = 0; i < officeCount; i++) {
        const row: any[] = [];
        const office = dept.offices[i];

        pdfColumnDefs.forEach(col => {
          if (col.id === 'srNo') {
            if (i === 0) row.push({ content: dept.srNo, rowSpan: officeCount });
          } else if (col.id === 'name') {
            if (i === 0) row.push({ content: dept.name, rowSpan: officeCount });
          } else if (col.id === 'offices_name') {
            row.push(office ? office.name : '-');
          } else if (col.id === 'offices_focal') {
            row.push(office ? (office.focalPerson || '-') : (dept.focalPerson || '-'));
          } else if (col.id === 'officialName') {
            if (i === 0) row.push({ content: dept.officialName || '-', rowSpan: officeCount });
          } else if (col.id === 'jobDescription') {
            if (i === 0) row.push({ content: dept.jobDescription || '-', rowSpan: officeCount });
          }
        });
        tableData.push(row);
      }
    });

    const headers = pdfColumnDefs.map(col => {
      if (col.id === 'offices_name') return `${col.label.toUpperCase()} (${data.reduce((acc, d) => acc + d.offices.length, 0)})`;
      return col.label.toUpperCase();
    });

    autoTable(doc, {
      startY: 80,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', font: 'times' },
      styles: { fontSize: 8, cellPadding: 8, font: 'times', valign: 'top' },
      columnStyles: pdfColumnDefs.reduce((acc, col, idx) => {
        let width = 100;
        if (col.id === 'srNo') width = 40;
        if (col.id === 'name') width = 150;
        if (col.id === 'offices_name') width = 200;
        if (col.id === 'offices_focal') width = 120;
        if (col.id === 'officialName') width = 100;
        if (col.id === 'jobDescription') width = 150;
        acc[idx] = { cellWidth: width };
        return acc;
      }, {} as any)
    });

    doc.save('department_handover.pdf');
  };

  const startEditing = (dept: Department) => {
    setEditingId(dept.id);
    setEditForm({ ...dept, offices: [...dept.offices] });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
    setIsAdding(false);
  };

  const saveEdit = () => {
    if (!editForm) return;
    if (isAdding) {
      setData([...data, { ...editForm, id: Date.now().toString() }]);
    } else {
      setData(data.map(d => d.id === editingId ? editForm : d));
    }
    cancelEditing();
  };

  const deleteDept = (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      setData(data.filter(d => d.id !== id));
    }
  };

  const addOfficeField = () => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      offices: [...editForm.offices, { id: `new-${Date.now()}`, name: '', focalPerson: '' }]
    });
  };

  const updateOfficeField = (idx: number, field: 'name' | 'focalPerson', value: string) => {
    if (!editForm) return;
    const newOffices = [...editForm.offices];
    newOffices[idx] = { ...newOffices[idx], [field]: value };
    setEditForm({ ...editForm, offices: newOffices });
  };

  const removeOfficeField = (idx: number) => {
    if (!editForm) return;
    const newOffices = editForm.offices.filter((_, i) => i !== idx);
    setEditForm({ ...editForm, offices: newOffices });
  };

  const getColumnWidth = (id: ColumnType) => {
    switch (id) {
      case 'srNo': return 'min-w-[60px] w-[60px]';
      case 'name': return 'min-w-[320px]';
      case 'offices': return 'min-w-[500px]';
      case 'officialName': return 'min-w-[220px]';
      case 'jobDescription': return 'min-w-[250px]';
      default: return 'min-w-[100px]';
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-serif italic text-3xl tracking-tight">Handover Matrix</h1>
          <p className="text-xs font-mono opacity-50 uppercase mt-1 tracking-widest">Departmental Administration System v1.0</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
            setIsAdding(true);
            setEditForm({ id: '', srNo: (data.length + 1).toString() + '.', name: '', focalPerson: '', offices: [], officialName: '', jobDescription: '' });
            }}
            className="flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-4 py-2 text-xs font-mono uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Sector
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 border border-[#141414] px-4 py-2 text-xs font-mono uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all cursor-pointer"
          >
            <Download size={14} /> Export PDF
          </button>
        </div>
      </header>

      {/* Main Table Area */}
      <main className="p-6 lg:p-8 overflow-x-auto font-serif custom-scrollbar">
        <div className="min-w-fit pr-8">
          <table className="w-full border-collapse border-r border-[#141414]">
          <thead>
            <tr className="border-y-2 border-l border-[#141414] divide-x border-[#141414]">
              {columnOrder.map((col, idx) => (
                <th key={col.id} className={`text-left py-4 px-3 border-[#141414] group/header relative ${getColumnWidth(col.id)}`}>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase opacity-50 tracking-widest">
                      {col.id === 'name' ? `${col.label} (${data.length})` : 
                       col.id === 'offices' ? `${col.label} (${data.reduce((acc, d) => acc + d.offices.length, 0)})` : 
                       col.label}
                    </span>
                    <div className="flex gap-2 opacity-30 group-hover/header:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveColumn(idx, 'left'); }}
                        disabled={idx === 0}
                        className="p-1.5 hover:bg-[#141414] hover:text-[#E4E3E0] disabled:opacity-10 disabled:hover:bg-transparent disabled:hover:text-inherit transition-colors cursor-pointer border border-[#141414]/10 rounded"
                        title="Move Left"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveColumn(idx, 'right'); }}
                        disabled={idx === columnOrder.length - 1}
                        className="p-1.5 hover:bg-[#141414] hover:text-[#E4E3E0] disabled:opacity-10 disabled:hover:bg-transparent disabled:hover:text-inherit transition-colors cursor-pointer border border-[#141414]/10 rounded"
                        title="Move Right"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {data.map((dept) => (
                <motion.tr 
                   key={dept.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   onClick={() => startEditing(dept)}
                   className="border-b border-x border-[#141414] divide-x divide-[#141414] group hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-pointer"
                >
                  {columnOrder.map((col) => {
                    switch (col.id) {
                      case 'srNo': 
                        return <td key={col.id} className="py-6 px-3 text-sm align-top">{dept.srNo}</td>;
                      case 'name':
                        return <td key={col.id} className="py-6 px-3 text-lg leading-tight align-top">{dept.name}</td>;
                      case 'offices':
                        return (
                          <td key={col.id} className="p-0 align-top">
                            <div className="flex flex-col h-full h-full min-h-max">
                              <div className="grid grid-cols-[1fr_150px] border-b border-[#141414]/20 bg-[#141414]/5 text-[9px] uppercase tracking-widest px-3 py-1.5 font-mono opacity-50">
                                <span>Org / Attached Office</span>
                                <span>Focal Person</span>
                              </div>
                              <div className="divide-y divide-[#141414]/30">
                                {dept.offices.length > 0 ? (
                                  dept.offices.map((office) => (
                                    <div key={office.id} className="grid grid-cols-[1fr_150px] divide-x divide-[#141414]/5 group/office">
                                      <div className="py-4 px-3 text-xs opacity-75 group-hover:opacity-100 leading-snug">
                                        {office.name}
                                      </div>
                                      <div className="py-4 px-3 text-[11px] italic opacity-50 group-hover:opacity-100 bg-white/5">
                                        {office.focalPerson || "—"}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="grid grid-cols-[1fr_150px] divide-x divide-[#141414]/5">
                                    <div className="py-4 px-3 text-[10px] uppercase opacity-30">
                                      — Parent Unit Only
                                    </div>
                                    <div className="py-4 px-3 text-[11px] italic opacity-40 italic">
                                      {dept.focalPerson || "—"}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      case 'officialName':
                        return <td key={col.id} className="py-6 px-3 align-top">{dept.officialName || "—"}</td>;
                      case 'jobDescription':
                        return <td key={col.id} className="py-6 px-3 align-top text-xs opacity-70 group-hover:opacity-100 leading-relaxed">{dept.jobDescription || "—"}</td>;
                      default:
                        return <td key={col.id}></td>;
                    }
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </main>

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {(editingId || isAdding) && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelEditing}
              className="absolute inset-0 bg-[#141414]/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#E4E3E0] border border-[#141414] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
                <div className="flex items-center gap-4">
                  <h2 className="font-serif italic text-2xl">{isAdding ? 'New Entry' : 'Refine Matrix Record'}</h2>
                  {!isAdding && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDept(editingId!);
                      }}
                      className="text-xs font-mono uppercase tracking-widest bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1 transition-all"
                    >
                      Delete Sector
                    </button>
                  )}
                </div>
                <button onClick={cancelEditing} className="hover:rotate-90 transition-transform cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-mono uppercase opacity-50 mb-2 tracking-widest text-[#141414]">SR. Number</label>
                      <input 
                        type="text" 
                        value={editForm.srNo}
                        onChange={(e) => setEditForm({...editForm, srNo: e.target.value})}
                        className="w-full bg-transparent border-b border-[#141414] py-2 font-mono text-sm focus:outline-none focus:border-b-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase opacity-50 mb-2 tracking-widest text-[#141414]">Department Name</label>
                      <textarea 
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full bg-transparent border-b border-[#141414] py-2 font-serif text-lg focus:outline-none focus:border-b-2 resize-none h-24"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase opacity-50 mb-2 tracking-widest text-[#141414]">Department Case Focal Person (Legacy)</label>
                      <input 
                        type="text" 
                        value={editForm.focalPerson}
                        onChange={(e) => setEditForm({...editForm, focalPerson: e.target.value})}
                        className="w-full bg-transparent border-b border-[#141414] py-2 font-serif focus:outline-none opacity-50"
                        placeholder="Overall Focal Person"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-[10px] font-mono uppercase opacity-50 mb-2 tracking-widest text-[#141414]">Assigned Official</label>
                        <input 
                          type="text" 
                          value={editForm.officialName}
                          onChange={(e) => setEditForm({...editForm, officialName: e.target.value})}
                          className="w-full bg-transparent border-b border-[#141414] py-2 font-mono text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase opacity-50 mb-2 tracking-widest text-[#141414]">Job Description</label>
                        <textarea 
                          value={editForm.jobDescription}
                          onChange={(e) => setEditForm({...editForm, jobDescription: e.target.value})}
                          className="w-full bg-transparent border-b border-[#141414] py-2 font-mono text-xs focus:outline-none resize-none h-24"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Attached Bodies */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-[10px] font-mono uppercase opacity-50 tracking-widest text-[#141414]">Attached Bodies / Offices</label>
                      <button 
                        onClick={addOfficeField}
                        className="text-[10px] font-mono uppercase flex items-center gap-1 bg-[#141414] text-[#E4E3E0] px-2 py-1"
                      >
                        <Plus size={10} /> Add Office
                      </button>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {editForm.offices.length === 0 && (
                        <div className="p-8 border border-dashed border-[#141414]/20 text-center opacity-40 italic text-sm">
                          No attached bodies listed.
                        </div>
                      )}
                      {editForm.offices.map((office, idx) => (
                        <div key={office.id} className="p-3 border border-[#141414]/10 rounded space-y-3 bg-[#E4E3E0]">
                          <div className="flex gap-2 items-start justify-between">
                            <span className="text-[10px] font-mono opacity-50">OFFICE #{idx + 1}</span>
                            <button 
                              onClick={() => removeOfficeField(idx)}
                              className="p-1 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[9px] font-mono uppercase opacity-40 mb-1">Office Name</label>
                              <textarea 
                                value={office.name}
                                onChange={(e) => updateOfficeField(idx, 'name', e.target.value)}
                                className="w-full bg-transparent border-b border-[#141414]/20 py-1 font-mono text-[11px] focus:outline-none focus:border-[#141414] resize-none min-h-[40px]"
                                placeholder="Enter office/organization name..."
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono uppercase opacity-40 mb-1">Focal Person</label>
                              <input 
                                type="text" 
                                value={office.focalPerson || ''}
                                onChange={(e) => updateOfficeField(idx, 'focalPerson', e.target.value)}
                                className="w-full bg-transparent border-b border-[#141414]/20 py-1 font-mono text-[11px] focus:outline-none focus:border-[#141414]"
                                placeholder="Enter focal person for this office..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#141414] flex justify-end gap-4 bg-white/50">
                <button 
                  onClick={cancelEditing}
                  className="px-6 py-2 text-xs font-mono uppercase tracking-widest hover:opacity-70 transition-all border border-[#141414] flex items-center gap-2"
                >
                  <X size={14} /> Abandon
                </button>
                <button 
                  onClick={saveEdit}
                  className="px-6 py-2 text-xs font-mono uppercase tracking-widest bg-[#141414] text-[#E4E3E0] hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <Check size={14} /> Commit Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #14141420;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #14141440;
        }
      `}</style>

    </div>
  );
}

