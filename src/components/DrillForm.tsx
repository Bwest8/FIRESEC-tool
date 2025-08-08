import React, { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  School,
  Shield,
  Flame,
  CheckCircle,
  XCircle,
  MessageSquare,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import districtData, { DistrictLocation } from '../data/DistrictLocations';

const months = [
  'FIRSTDAY',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
];

const monthLabels: Record<string, string> = {
  FIRSTDAY: 'First Day of School',
  JUL: 'July',
  AUG: 'August',
  SEP: 'September',
  OCT: 'October',
  NOV: 'November',
  DEC: 'December',
  JAN: 'January',
  FEB: 'February',
  MAR: 'March',
  APR: 'April',
  MAY: 'May',
  JUN: 'June',
};

// Hardcoded limits from your measure set
const measureSetLimits: Record<string, Record<string, number>> = {
  FIRSTDAY: { FIRE: 1, SECURITY: 0 },
  JUL: { FIRE: 3, SECURITY: 1 },
  AUG: { FIRE: 3, SECURITY: 1 },
  SEP: { FIRE: 3, SECURITY: 1 },
  OCT: { FIRE: 3, SECURITY: 1 },
  NOV: { FIRE: 3, SECURITY: 1 },
  DEC: { FIRE: 3, SECURITY: 1 },
  JAN: { FIRE: 3, SECURITY: 1 },
  FEB: { FIRE: 3, SECURITY: 1 },
  MAR: { FIRE: 3, SECURITY: 1 },
  APR: { FIRE: 3, SECURITY: 1 },
  MAY: { FIRE: 3, SECURITY: 1 },
  JUN: { FIRE: 3, SECURITY: 1 },
};

interface DrillEntry {
  type?: string;
  indicator?: string;
  date?: string;
  reason?: string;
  comment?: string;
  errors?: string[];
  warnings?: string[];
}

interface FormData {
  [schoolNum: string]: {
    [month: string]: DrillEntry[];
  };
}

export default function DrillForm() {
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedAUN, setSelectedAUN] = useState('');
  const [formData, setFormData] = useState<FormData>({});
  const [isValid, setIsValid] = useState(false);

  const currentYear = new Date().getFullYear();
  const schoolYears = Array.from({ length: 5 }, (_, i) => {
    const startYear = currentYear - i;
    const endYear = startYear + 1;
    return {
      label: `${startYear}-${endYear}`,
      value: `${endYear}-06-30`,
    };
  });

  const districts = Array.from(
    new Map(districtData.map((d) => [d.AUN, d.DISTRICT_NAME]))
  );

  const schools = districtData.filter((d) => d.AUN === selectedAUN);

  const addDrillRow = (schoolNum: string, month: string) => {
    setFormData((prev) => {
      const monthRows = prev[schoolNum]?.[month] || [];
      const type = monthRows[0]?.type || 'FIRE';
      const maxAllowed = measureSetLimits[month]?.[type] || 1;

      if (monthRows.length >= maxAllowed) {
        alert(
          `You cannot add more than ${maxAllowed} ${type} drill(s) for ${monthLabels[month]}`
        );
        return prev;
      }

      return {
        ...prev,
        [schoolNum]: {
          ...prev[schoolNum],
          [month]: [
            ...monthRows,
            {
              type: type,
              indicator: 'N',
              date: '',
              reason: '',
              comment: '',
              errors: [],
              warnings: [],
            },
          ],
        },
      };
    });
  };

  const removeDrillRow = (schoolNum: string, month: string, idx: number) => {
    setFormData((prev) => {
      const monthRows = prev[schoolNum]?.[month] || [];
      return {
        ...prev,
        [schoolNum]: {
          ...prev[schoolNum],
          [month]: monthRows.filter((_, i) => i !== idx),
        },
      };
    });
  };

  const handleChange = (
    schoolNum: string,
    month: string,
    idx: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => {
      const monthRows = prev[schoolNum]?.[month] || [];
      const updatedRows = [...monthRows];
      updatedRows[idx] = { ...updatedRows[idx], [field]: value };
      const updated = {
        ...prev,
        [schoolNum]: {
          ...prev[schoolNum],
          [month]: updatedRows,
        },
      };
      return validateRow(updated, schoolNum, month, idx);
    });
  };

  const validateRow = (
    data: FormData,
    schoolNum: string,
    month: string,
    idx: number
  ) => {
    const row = data[schoolNum]?.[month]?.[idx] || {};
    const errors: string[] = [];
    const warnings: string[] = [];
    const isFirstDay = month === 'FIRSTDAY';
    const indicator = row.indicator || (isFirstDay ? 'Y' : 'N');
    const date = row.date || '';
    const reason = row.reason || '';
    const comment = row.comment || '';

    if (isFirstDay) {
      if (indicator !== 'Y') errors.push('First Day must have INDICATOR = Y');
      if (!date) errors.push('First Day must have a DATE');
    } else {
      if (indicator === 'Y' && !date)
        errors.push('Date required when drill conducted');
      if (indicator === 'N') {
        if (!reason) errors.push('Reason required when no drill conducted');
        if (reason === '03' && !comment)
          errors.push("Comment required for 'Other' reason");
      }
    }

    if (row.type === 'SECURITY' && indicator === 'Y' && date) {
      const firstDayDate = data[schoolNum]?.['FIRSTDAY']?.[0]?.date;
      if (firstDayDate) {
        const diffDays = Math.floor(
          (new Date(date).getTime() - new Date(firstDayDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (diffDays > 90) {
          warnings.push('Security drill is more than 90 days after FIRSTDAY');
        }
      }
      const secDrillsAfter90 = months.filter((m) => {
        if (m === 'FIRSTDAY') return false;
        const drills = data[schoolNum]?.[m] || [];
        return drills.some((r) => {
          if (r.type === 'SECURITY' && r.indicator === 'Y' && r.date) {
            const diff = Math.floor(
              (new Date(r.date).getTime() -
                new Date(
                  data[schoolNum]?.['FIRSTDAY']?.[0]?.date || ''
                ).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return diff > 90;
          }
          return false;
        });
      }).length;
      if (secDrillsAfter90 > 2) {
        warnings.push('More than 2 security drills after 90 days');
      }
    }

    data[schoolNum][month][idx] = { ...row, errors, warnings };
    return { ...data };
  };

  useEffect(() => {
    let allValid = true;
    schools.forEach((school) => {
      months.forEach((month) => {
        const drills = formData[school.SCHOOL_NUMBER]?.[month] || [];
        drills.forEach((row) => {
          if (!row || (row.errors && row.errors.length > 0)) {
            allValid = false;
          }
        });
      });
    });
    setIsValid(allValid && schools.length > 0);
  }, [formData, schools]);

  const exportCSV = () => {
    if (!isValid) return;
    const rows: any[] = [];
    schools.forEach((school) => {
      months.forEach((month) => {
        const drills = formData[school.SCHOOL_NUMBER]?.[month] || [];
        drills.forEach((entry, idx) => {
          rows.push({
            'SUBMITTING AUN': school.AUN,
            'SCHOOL NUMBER': school.SCHOOL_NUMBER,
            'SCHOOL YEAR DATE': selectedYear,
            'CATEGORY 01': 'DRILL',
            'CATEGORY 02': entry.type || 'FIRE',
            'CATEGORY 03': month,
            'CATEGORY 04': idx > 0 ? String(idx + 1).padStart(2, '0') : '',
            NC01: '',
            NC02: '',
            NC03: '',
            NC04: '',
            NC05: '',
            NC06: '',
            'PRIMARY MEASURE': 'INDICATOR',
            NC07: '',
            NC08: '',
            NC09: '',
            INDICATOR: entry.indicator || (month === 'FIRSTDAY' ? 'Y' : 'N'),
            NC10: '',
            DATE: entry.date || '',
            NC11: '',
            COMMENT: entry.comment || '',
          });
        });
      });
    });
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 12);
    saveAs(blob, `${selectedAUN}_LOCATION_FACT_${timestamp}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-blue-900 text-white py-6 border-b-4 border-blue-700">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-6">
          <Shield className="w-10 h-10" />
          <div>
            <h1 className="text-3xl font-bold">
              Fire & Security Drill Reporting
            </h1>
            <p className="text-lg opacity-90">
              Unofficial PIMS Compliance Tool
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* School Year Selection */}
        <section className="bg-white border border-gray-300 rounded-lg shadow-sm mb-8 p-6">
          <label className="block text-lg font-bold mb-2">
            Select School Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedAUN('');
            }}
            className="w-full border border-gray-400 rounded px-4 py-2"
          >
            <option value="">- Select a school year -</option>
            {schoolYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </section>

        {/* District Selection */}
        {selectedYear && (
          <section className="bg-white border border-gray-300 rounded-lg shadow-sm mb-8 p-6">
            <label className="block text-lg font-bold mb-2">
              Select Your District
            </label>
            <select
              value={selectedAUN}
              onChange={(e) => setSelectedAUN(e.target.value)}
              className="w-full border border-gray-400 rounded px-4 py-2"
            >
              <option value="">- Select a district -</option>
              {districts.map(([aun, name]) => (
                <option key={aun} value={aun}>
                  {name}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Schools Table */}
        {selectedAUN && schools.length > 0 && (
          <>
            {schools.map((school) => (
              <section
                key={school.SCHOOL_NUMBER}
                className="bg-white border border-gray-300 rounded-lg shadow-sm mb-8"
              >
                <header className="bg-blue-50 px-6 py-4 border-b border-gray-300 flex items-center gap-3">
                  <School className="w-5 h-5 text-blue-700" />
                  <h2 className="text-xl font-bold">{school.LOCATION_NAME}</h2>
                  <span className="ml-auto text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    #{school.SCHOOL_NUMBER}
                  </span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="border px-3 py-2 text-left">Month</th>
                        <th className="border px-3 py-2">Drill Type</th>
                        <th className="border px-3 py-2">Conducted</th>
                        <th className="border px-3 py-2">Date</th>
                        <th className="border px-3 py-2">Reason</th>
                        <th className="border px-3 py-2">Comment</th>
                        <th className="border px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((month) => {
                        const drills = formData[school.SCHOOL_NUMBER]?.[
                          month
                        ] || [
                          {
                            type: 'FIRE',
                            indicator: month === 'FIRSTDAY' ? 'Y' : 'N',
                            date: '',
                            reason: '',
                            comment: '',
                            errors: [],
                            warnings: [],
                          },
                        ];
                        return drills.map((rowData, idx) => {
                          const indicator =
                            rowData.indicator ||
                            (month === 'FIRSTDAY' ? 'Y' : 'N');
                          const maxAllowed =
                            measureSetLimits[month]?.[rowData.type || 'FIRE'] ||
                            1;
                          return (
                            <tr
                              key={`${school.SCHOOL_NUMBER}-${month}-${idx}`}
                              className={
                                month === 'FIRSTDAY' ? 'bg-blue-50' : ''
                              }
                            >
                              {idx === 0 && (
                                <td
                                  rowSpan={drills.length}
                                  className="border px-3 py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <Calendar
                                      className={`w-5 h-5 flex-shrink-0 ${
                                        month === 'FIRSTDAY'
                                          ? 'text-blue-600'
                                          : 'text-gray-500'
                                      }`}
                                    />
                                    <span>{monthLabels[month]}</span>
                                  </div>
                                </td>
                              )}
                              <td className="border px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {rowData.type === 'SECURITY' ? (
                                    <Shield className="w-5 h-5 flex-shrink-0 text-blue-600" />
                                  ) : (
                                    <Flame className="w-5 h-5 flex-shrink-0 text-orange-500" />
                                  )}
                                  <select
                                    value={rowData.type || 'FIRE'}
                                    onChange={(e) =>
                                      handleChange(
                                        school.SCHOOL_NUMBER,
                                        month,
                                        idx,
                                        'type',
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-gray-400 rounded px-2 py-1"
                                  >
                                    <option value="FIRE">Fire Drill</option>
                                    <option value="SECURITY">
                                      Security Drill
                                    </option>
                                  </select>
                                </div>
                              </td>
                              <td className="border px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {indicator === 'Y' ? (
                                    <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
                                  ) : (
                                    <XCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                                  )}
                                  <select
                                    value={indicator}
                                    onChange={(e) =>
                                      handleChange(
                                        school.SCHOOL_NUMBER,
                                        month,
                                        idx,
                                        'indicator',
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-gray-400 rounded px-2 py-1"
                                  >
                                    <option value="Y">Yes</option>
                                    <option value="N">No</option>
                                  </select>
                                </div>
                              </td>
                              <td className="border px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    value={rowData.date || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        school.SCHOOL_NUMBER,
                                        month,
                                        idx,
                                        'date',
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-gray-400 rounded px-2 py-1"
                                  />
                                </div>
                                {rowData.errors?.map((err, i) => (
                                  <p
                                    key={i}
                                    className="text-red-600 text-xs mt-1"
                                  >
                                    {err}
                                  </p>
                                ))}
                                {rowData.warnings?.map((warn, i) => (
                                  <p
                                    key={i}
                                    className="text-yellow-600 text-xs mt-1"
                                  >
                                    {warn}
                                  </p>
                                ))}
                              </td>
                              <td className="border px-3 py-2">
                                <select
                                  value={rowData.reason || ''}
                                  onChange={(e) =>
                                    handleChange(
                                      school.SCHOOL_NUMBER,
                                      month,
                                      idx,
                                      'reason',
                                      e.target.value
                                    )
                                  }
                                  disabled={indicator === 'Y'}
                                  className="w-full border border-gray-400 rounded px-2 py-1"
                                >
                                  <option value="">-</option>
                                  <option value="01">01 - No Students</option>
                                  <option value="02">
                                    02 - Not in Session
                                  </option>
                                  <option value="03">03 - Other</option>
                                </select>
                              </td>
                              <td className="border px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-5 h-5 flex-shrink-0 text-gray-500" />
                                  <input
                                    type="text"
                                    value={rowData.comment || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        school.SCHOOL_NUMBER,
                                        month,
                                        idx,
                                        'comment',
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-gray-400 rounded px-2 py-1"
                                  />
                                </div>
                              </td>
                              <td className="border px-3 py-2">
                                {idx === drills.length - 1 &&
                                  drills.length < maxAllowed && (
                                    <button
                                      onClick={() =>
                                        addDrillRow(school.SCHOOL_NUMBER, month)
                                      }
                                    >
                                      <PlusCircle className="w-5 h-5 text-green-600" />
                                    </button>
                                  )}
                                {idx > 0 && (
                                  <button
                                    onClick={() =>
                                      removeDrillRow(
                                        school.SCHOOL_NUMBER,
                                        month,
                                        idx
                                      )
                                    }
                                  >
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </>
        )}

        {/* Export */}
        {selectedAUN && schools.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-6">
            <button
              onClick={exportCSV}
              disabled={!isValid}
              className={`px-8 py-3 text-lg font-medium text-white rounded ${
                isValid
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              <Download className="inline-block mr-2" />
              Export CSV for PIMS
            </button>
            {!isValid && (
              <p className="text-red-600 text-sm mt-2">
                Please fix all validation errors before exporting.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
