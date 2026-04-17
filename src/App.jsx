import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BarChart3, Settings2, Eye, EyeOff, Upload, Download, AlertCircle } from 'lucide-react';

const STAGES = ['Foundation', 'Crawl', 'Walk', 'Run', 'Fly'];

const ROW_COLORS = [
  { row: 'bg-slate-50',   label: 'bg-slate-100'   },
  { row: 'bg-emerald-50', label: 'bg-emerald-100' },
  { row: 'bg-blue-50',    label: 'bg-blue-100'    },
  { row: 'bg-amber-50',   label: 'bg-amber-100'   },
  { row: 'bg-purple-50',  label: 'bg-purple-100'  },
  { row: 'bg-rose-50',    label: 'bg-rose-100'    },
];

const INITIAL_DATA = [
  {
    app: 'Policy & Compliance',
    features: [
      { id: 1, name: 'Policy Lifecycle Management', stage: 'Crawl', adoption: 90, active: true },
      { id: 2, name: 'Authority Document Import', stage: 'Crawl', adoption: 100, active: true },
      { id: 3, name: 'Automated Control Testing', stage: 'Walk', adoption: 45, active: true },
      { id: 4, name: 'Policy Exceptions (Basic)', stage: 'Walk', adoption: 60, active: true },
      { id: 5, name: 'Regulatory Change Mapping', stage: 'Run', adoption: 15, active: true },
      { id: 6, name: 'AI-driven Policy Mapping', stage: 'Fly', adoption: 0, active: false }
    ]
  },
  {
    app: 'Risk Management',
    features: [
      { id: 7, name: 'Risk Register Setup', stage: 'Crawl', adoption: 85, active: true },
      { id: 8, name: 'Manual Assessments', stage: 'Crawl', adoption: 70, active: true },
      { id: 9, name: 'Risk Indicators (KRIs)', stage: 'Walk', adoption: 30, active: true },
      { id: 10, name: 'Advanced Risk Assessment (ARA)', stage: 'Walk', adoption: 20, active: true },
      { id: 11, name: 'Monte Carlo Simulations', stage: 'Run', adoption: 5, active: true },
      { id: 12, name: 'Predictive Risk Intelligence', stage: 'Fly', adoption: 0, active: false }
    ]
  },
  {
    app: 'Audit Management',
    features: [
      { id: 13, name: 'Engagement Planning', stage: 'Crawl', adoption: 95, active: true },
      { id: 14, name: 'Audit Testing', stage: 'Crawl', adoption: 80, active: true },
      { id: 15, name: 'Issue Management', stage: 'Walk', adoption: 55, active: true },
      { id: 16, name: 'Evidence Warehouse', stage: 'Run', adoption: 10, active: true },
      { id: 17, name: 'Continuous Auditing', stage: 'Fly', adoption: 0, active: false }
    ]
  },
  {
    app: 'IRM Core (Common Controls)',
    features: [
      { id: 18, name: 'Entity Scoping', stage: 'Crawl', adoption: 100, active: true },
      { id: 19, name: 'Basic Reporting', stage: 'Crawl', adoption: 90, active: true },
      { id: 20, name: 'GRC Workbench', stage: 'Walk', adoption: 40, active: true },
      { id: 21, name: 'Performance Analytics', stage: 'Run', adoption: 25, active: true }
    ]
  },
  {
    app: 'Regulatory Change (RCM)',
    features: [
      { id: 22, name: 'RSS Feed Integration', stage: 'Walk', adoption: 30, active: true },
      { id: 23, name: 'Impact Assessment Workflow', stage: 'Run', adoption: 10, active: true },
      { id: 24, name: 'Automated Tasking', stage: 'Fly', adoption: 0, active: false }
    ]
  }
];

// Parse rows from a sheet into the app data structure.
// Expected columns: Application, Feature, Stage, Adoption, Active
function parseRows(rows) {
  const errors = [];
  const appMap = new Map();
  let idCounter = 1;

  rows.forEach((row, i) => {
    const lineNum = i + 2; // 1-indexed, skipping header
    const app = String(row['Application'] ?? '').trim();
    const name = String(row['Feature'] ?? '').trim();
    const stage = String(row['Stage'] ?? '').trim();
    const adoptionRaw = row['Adoption'];
    const activeRaw = row['Active'];

    if (!app || !name) return; // skip blank rows silently

    if (!STAGES.includes(stage)) {
      errors.push(`Row ${lineNum}: Stage "${stage}" is not one of Foundation, Crawl, Walk, Run, Fly`);
      return;
    }

    const adoption = Math.max(0, Math.min(100, parseInt(adoptionRaw) || 0));

    // Active defaults to true; accepts: true, false, yes, no, 1, 0
    let active = true;
    if (activeRaw !== undefined && activeRaw !== null && activeRaw !== '') {
      const v = String(activeRaw).trim().toLowerCase();
      active = v === 'true' || v === 'yes' || v === '1';
    }

    if (!appMap.has(app)) appMap.set(app, []);
    appMap.get(app).push({ id: idCounter++, name, stage, adoption, active });
  });

  const data = Array.from(appMap.entries()).map(([app, features]) => ({ app, features }));
  return { data, errors };
}

function downloadTemplate() {
  const templateRows = [
    { Application: 'Policy & Compliance', Feature: 'Policy Lifecycle Management', Stage: 'Foundation', Adoption: 100, Active: 'yes' },
    { Application: 'Policy & Compliance', Feature: 'Policy Lifecycle Management', Stage: 'Crawl', Adoption: 90, Active: 'yes' },
    { Application: 'Policy & Compliance', Feature: 'Automated Control Testing', Stage: 'Walk', Adoption: 45, Active: 'yes' },
    { Application: 'Risk Management', Feature: 'Risk Register Setup', Stage: 'Crawl', Adoption: 85, Active: 'yes' },
    { Application: 'Risk Management', Feature: 'Predictive Risk Intelligence', Stage: 'Fly', Adoption: 0, Active: 'no' },
  ];
  const ws = XLSX.utils.json_to_sheet(templateRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'IRM Roadmap');
  XLSX.writeFile(wb, 'irm_roadmap_template.xlsx');
}

const App = () => {
  const [data, setData] = useState(INITIAL_DATA);
  const [editingFeature, setEditingFeature] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [hiddenStages, setHiddenStages] = useState(new Set());
  const fileInputRef = useRef(null);

  const toggleStageVisibility = (stage) => {
    setHiddenStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage); else next.add(stage);
      return next;
    });
  };

  const visibleStages = STAGES.filter(s => !hiddenStages.has(s));

  const stageAvg = (stage) => {
    const active = data.flatMap(a => a.features).filter(f => f.stage === stage && f.active);
    return active.length ? Math.round(active.reduce((s, f) => s + f.adoption, 0) / active.length) : 0;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          setUploadError('The spreadsheet appears to be empty.');
          return;
        }

        const { data: parsed, errors } = parseRows(rows);

        if (errors.length > 0) {
          setUploadError(errors.join('\n'));
          return;
        }

        if (parsed.length === 0) {
          setUploadError('No valid rows found. Check that columns are named Application, Feature, Stage, Adoption, Active.');
          return;
        }

        setData(parsed);
        setUploadSuccess(true);
      } catch (err) {
        setUploadError('Could not read file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = '';
  };

  const updateAdoption = (appIndex, featureId, value) => {
    const newData = [...data];
    const feature = newData[appIndex].features.find(f => f.id === featureId);
    feature.adoption = Math.max(0, Math.min(100, parseInt(value) || 0));
    setData(newData);
  };

  const toggleActive = (appIndex, featureId) => {
    const newData = [...data];
    const feature = newData[appIndex].features.find(f => f.id === featureId);
    feature.active = !feature.active;
    setData(newData);
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'Foundation': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Crawl': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Walk': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Run': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Fly': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageAccent = (stage) => {
    switch (stage) {
      case 'Foundation': return 'border-l-slate-400';
      case 'Crawl': return 'border-l-emerald-500';
      case 'Walk': return 'border-l-blue-500';
      case 'Run': return 'border-l-amber-500';
      case 'Fly': return 'border-l-purple-500';
      default: return 'border-l-gray-300';
    }
  };

  const getAdoptionColor = (percent) => {
    if (percent >= 80) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-blue-500';
    if (percent > 0) return 'bg-amber-500';
    return 'bg-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="w-full">
        <header className="mb-8">
          {/* Title + Legend */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">ServiceNow IRM Product Capabilities</h1>
              <p className="mt-2 text-gray-600">GRC Adoption &amp; Maturity View</p>
            </div>
            <div className="hidden md:flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                <span><span className="font-semibold">80–100%</span> — Mature</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                <span><span className="font-semibold">50–79%</span> — Well Underway</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                <span><span className="font-semibold">1–49%</span> — Enabled/Early Adoption</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300 shrink-0"></span>
                <span className="font-semibold">0%</span>
              </div>
            </div>
          </div>

        </header>

        {/* Matrix Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 w-px whitespace-nowrap font-semibold text-gray-500 uppercase text-xs tracking-wider border-r border-gray-200">Application</th>
                  {visibleStages.map(stage => (
                    <th key={stage} style={{ width: `${100 / visibleStages.length}%` }} className="p-4 text-center font-bold text-sm border-r border-gray-200 last:border-r-0">
                      <div className={`inline-block px-3 py-1 rounded-full text-xs mb-2 border ${getStageColor(stage)}`}>
                        {stage}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, appIdx) => {
                  const rc = ROW_COLORS[appIdx % ROW_COLORS.length];
                  return (
                  <tr key={row.app} className={`border-b border-gray-100 transition-colors ${rc.row}`}>
                    <td className={`p-4 font-medium text-gray-800 border-r border-gray-200 whitespace-nowrap ${rc.label}`}>
                      {row.app}
                    </td>
                    {visibleStages.map(stage => (
                      <td key={stage} className="p-4 align-top border-r border-gray-200 last:border-r-0">
                        <div className="flex flex-col gap-3">
                          {row.features
                            .filter(f => f.stage === stage && f.active)
                            .map(feature => (
                              <div
                                key={feature.id}
                                className={`group relative bg-white p-3 rounded-lg border border-gray-200 border-l-4 ${getStageAccent(stage)} shadow-md hover:shadow-lg transition-all cursor-default`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-sm font-semibold text-gray-700 leading-tight pr-4">
                                    {feature.name}
                                  </span>
                                  <button
                                    onClick={() => setEditingFeature({ appIdx, ...feature })}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-all"
                                  >
                                    <Settings2 size={12} />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-500 ${getAdoptionColor(feature.adoption)}`}
                                      style={{ width: `${feature.adoption}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold text-gray-500 tabular-nums">
                                    {feature.adoption}%
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="flex items-center gap-2 font-bold mb-3 text-gray-800">
              <BarChart3 size={18} className="text-blue-500" />
              Avg. Adoption by Stage
            </h3>
            <div className="space-y-2">
              {STAGES.map(stage => {
                const avg = stageAvg(stage);
                const hidden = hiddenStages.has(stage);
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStageVisibility(stage)}
                      className="text-gray-400 hover:text-blue-600 transition-colors shrink-0"
                      title={hidden ? 'Show column' : 'Hide column'}
                    >
                      {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border w-24 text-center shrink-0 ${getStageColor(stage)}`}>
                      {stage}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getAdoptionColor(avg)}`}
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold tabular-nums w-8 text-right ${hidden ? 'text-gray-300' : 'text-gray-600'}`}>
                      {avg}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Data controls */}
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              <Download size={14} />
              Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <Upload size={14} />
              Upload Spreadsheet
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          {uploadSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
              Spreadsheet loaded successfully.
              <button onClick={() => setUploadSuccess(false)} className="ml-auto text-emerald-500 hover:text-emerald-700">&#x2715;</button>
            </div>
          )}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <div className="flex items-start gap-2 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <pre className="whitespace-pre-wrap font-sans">{uploadError}</pre>
                <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600">&#x2715;</button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingFeature && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">Edit Feature</h2>
                <button onClick={() => setEditingFeature(null)} className="text-gray-400 hover:text-gray-600">&#x2715;</button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Feature Name</label>
                  <p className="text-gray-900 font-medium">{editingFeature.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                    Adoption Level ({editingFeature.adoption}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={editingFeature.adoption}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateAdoption(editingFeature.appIdx, editingFeature.id, val);
                      setEditingFeature({ ...editingFeature, adoption: val });
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                    <span>0% (Not Started)</span>
                    <span>100% (Mature)</span>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setEditingFeature(null)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      toggleActive(editingFeature.appIdx, editingFeature.id);
                      setEditingFeature(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                  >
                    Hide Feature
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
