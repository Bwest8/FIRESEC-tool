import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Label } from './ui/label';
import { Table, THead, TBody, TR, TH, TD } from './ui/table';
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

// Local type for district locations (to support dynamic import + JSON fetch)
interface DistrictLocation {
  AUN: string;
  DISTRICT_NAME: string;
  SCHOOL_NUMBER: string;
  LOCATION_NAME: string;
  ORG_TYPE: string;
}

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
  dateErrors?: string[];
  reasonErrors?: string[];
  commentErrors?: string[];
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
  // District data is lazy-loaded to keep initial bundle light
  const [districtData, setDistrictData] = useState<DistrictLocation[] | null>(null);
  const [districtsError, setDistrictsError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const schoolYears = Array.from({ length: 5 }, (_, i) => {
    const startYear = currentYear - i;
    const endYear = startYear + 1;
    return {
      label: `${startYear}-${endYear}`,
      value: `${endYear}-06-30`,
    };
  });

  // Load districts data after user selects a year (defers heavy data until needed)
  useEffect(() => {
    let cancelled = false;
    async function loadDistricts() {
      if (!selectedYear || districtData) return;
      setDistrictsError(null);
      try {
  const res = await fetch('/DistrictLocation.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DistrictLocation[];
        if (!Array.isArray(json) || json.length === 0)
          throw new Error('Empty DistrictLocation.json');
        if (!cancelled) setDistrictData(json);
      } catch (err) {
        if (!cancelled)
          setDistrictsError('Unable to load district list from DistrictLocation.json.');
      }
    }
    loadDistricts();
    return () => {
      cancelled = true;
    };
  }, [selectedYear, districtData]);

  const districts = districtData
    ? Array.from(new Map(districtData.map((d) => [d.AUN, d.DISTRICT_NAME])))
    : [];

  const schools = (districtData || []).filter((d) => d.AUN === selectedAUN);

  // Helper: timezone-safe day difference for YYYY-MM-DD inputs
  const diffInCalendarDays = (dateStr: string, baseStr: string) => {
    if (!dateStr || !baseStr) return 0;
    const [y1, m1, d1] = dateStr.split('-').map((n) => parseInt(n, 10));
    const [y2, m2, d2] = baseStr.split('-').map((n) => parseInt(n, 10));
    // Use UTC to avoid DST/timezone shifts
    const t1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
    const t2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
    return Math.floor((t1 - t2) / (1000 * 60 * 60 * 24));
  };

  const addDrillRow = (schoolNum: string, month: string) => {
    setFormData((prev) => {
      const monthRows = prev[schoolNum]?.[month] || [];
      const limits = measureSetLimits[month] || { FIRE: 0, SECURITY: 0 };
      const counts = monthRows.reduce(
        (acc, r) => {
          const t = (r?.type === 'SECURITY' ? 'SECURITY' : 'FIRE') as 'FIRE' | 'SECURITY';
          acc[t] += 1;
          return acc;
        },
        { FIRE: 0, SECURITY: 0 }
      );
      const lastType = (monthRows[monthRows.length - 1]?.type || 'FIRE') as
        | 'FIRE'
        | 'SECURITY';
      let addType: 'FIRE' | 'SECURITY' = lastType;
      if (counts[addType] >= (limits as any)[addType]) {
        const other = addType === 'FIRE' ? 'SECURITY' : 'FIRE';
        if (counts[other] < (limits as any)[other]) addType = other;
      }
      // If neither FIRE nor SECURITY is available, do nothing
      if (
        counts.FIRE >= (limits as any).FIRE &&
        counts.SECURITY >= (limits as any).SECURITY
      ) {
        return prev;
      }

      return {
        ...prev,
        [schoolNum]: {
          ...prev[schoolNum],
          [month]: [
            ...monthRows,
            {
              type: month === 'FIRSTDAY' ? 'FIRE' : addType,
              indicator: month === 'FIRSTDAY' ? 'Y' : 'N',
              date: '',
              reason: '',
              comment: '',
              errors: [],
              dateErrors: [],
              reasonErrors: [],
              commentErrors: [],
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

      // Enforce per-type limits on type change
      if (field === 'type') {
        const newType = (value === 'SECURITY' ? 'SECURITY' : 'FIRE') as
          | 'FIRE'
          | 'SECURITY';
        const limits = measureSetLimits[month] || { FIRE: 0, SECURITY: 0 };
        const counts = monthRows.reduce(
          (acc, r, i) => {
            if (i === idx) return acc; // exclude current row when evaluating
            const t = (r?.type === 'SECURITY' ? 'SECURITY' : 'FIRE') as 'FIRE' | 'SECURITY';
            acc[t] += 1;
            return acc;
          },
          { FIRE: 0, SECURITY: 0 }
        );
        if (counts[newType] >= (limits as any)[newType]) {
          // Block change and add a warning message inline
          const row = { ...updatedRows[idx] };
          const w = new Set([...(row.warnings || []), `Monthly limit reached for ${newType} drills`]);
          updatedRows[idx] = { ...row, warnings: Array.from(w) } as DrillEntry;
          return {
            ...prev,
            [schoolNum]: {
              ...prev[schoolNum],
              [month]: updatedRows,
            },
          };
        }
      }

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
    const dateErrors: string[] = [];
    const reasonErrors: string[] = [];
    const commentErrors: string[] = [];
    const warnings: string[] = [];
    const isFirstDay = month === 'FIRSTDAY';
    // FIRSTDAY: force type FIRE and indicator Y
    const indicator = isFirstDay ? 'Y' : row.indicator || 'N';
    if (isFirstDay && row.type !== 'FIRE') {
      row.type = 'FIRE';
    }
    const date = row.date || '';
    const reason = isFirstDay ? '' : row.reason || '';
    const comment = row.comment || '';

    if (isFirstDay) {
      if (indicator !== 'Y') dateErrors.push('First Day must have INDICATOR = Y');
      if (!date) dateErrors.push('First Day must have a DATE');
    } else {
      if (indicator === 'Y' && !date)
        dateErrors.push('Date required when drill conducted');
      if (indicator === 'N') {
        if (!reason) reasonErrors.push('Reason required when no drill conducted');
        if (reason === '03' && !comment)
          commentErrors.push("Comment required for 'Other' reason");
      }
    }

    if (row.type === 'SECURITY' && indicator === 'Y' && date) {
      const firstDayDate = data[schoolNum]?.['FIRSTDAY']?.[0]?.date;
      if (firstDayDate) {
        const diffDays = diffInCalendarDays(date, firstDayDate);
        if (diffDays > 90) {
          warnings.push('Security drill is more than 90 days after FIRSTDAY');
        }
      }
      const secDrillsAfter90 = months.filter((m) => {
        if (m === 'FIRSTDAY') return false;
        const drills = data[schoolNum]?.[m] || [];
        return drills.some((r) => {
          if (r.type === 'SECURITY' && r.indicator === 'Y' && r.date) {
            const diff = diffInCalendarDays(
              r.date,
              data[schoolNum]?.['FIRSTDAY']?.[0]?.date || ''
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

    data[schoolNum][month][idx] = {
      ...row,
      dateErrors,
      reasonErrors,
      commentErrors,
      warnings,
      // Keep legacy errors for validation check
      errors: [...dateErrors, ...reasonErrors, ...commentErrors]
    };
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
            REASON: entry.reason || '',
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
          <Label className="text-lg font-bold mb-2">Select School Year</Label>
          <Select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedAUN('');
            }}
            className="w-full"
          >
            <option value="">- Select a school year -</option>
            {schoolYears.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </Select>
        </section>

        {/* District Selection */}
        {selectedYear && (
          <section className="bg-white border border-gray-300 rounded-lg shadow-sm mb-8 p-6">
            <Label className="text-lg font-bold mb-2">Select Your District</Label>
            <Select
              value={selectedAUN}
              onChange={(e) => setSelectedAUN(e.target.value)}
              className="w-full"
              disabled={!districtData}
            >
              <option value="">- Select a district -</option>
              {districts.map(([aun, name]) => (
                <option key={aun} value={aun}>
                  {name}
                </option>
              ))}
            </Select>
            {!districtData && !districtsError && (
              <p className="text-sm text-gray-600 mt-2">Loading district list…</p>
            )}
            {districtsError && (
              <p className="text-sm text-red-600 mt-2">{districtsError}</p>
            )}
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
                  <Table>
                    <THead>
                      <TR>
                        <TH>Month</TH>
                        <TH>Drill Type</TH>
                        <TH>Conducted</TH>
                        <TH>Date</TH>
                        <TH>Reason</TH>
                        <TH>Comment</TH>
                        <TH className="text-center w-28">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {months.map((month) => {
                        const drills = formData[school.SCHOOL_NUMBER]?.[month] || [
                            {
                              type: 'FIRE',
                              indicator: month === 'FIRSTDAY' ? 'Y' : 'N',
                              date: '',
                              reason: '',
                              comment: '',
                              errors: [],
                              dateErrors: [],
                              reasonErrors: [],
                              commentErrors: [],
                              warnings: [],
                            },
                          ];
                        const limits = measureSetLimits[month] || { FIRE: 0, SECURITY: 0 };
                        const counts = drills.reduce(
                          (acc, r) => {
                            const t = (r?.type === 'SECURITY' ? 'SECURITY' : 'FIRE') as 'FIRE' | 'SECURITY';
                            acc[t] += 1;
                            return acc;
                          },
                          { FIRE: 0, SECURITY: 0 }
                        );
                        const canAddAny = counts.FIRE < (limits as any).FIRE || counts.SECURITY < (limits as any).SECURITY;
                        return drills.map((rowData, idx) => {
                          const indicator =
                            rowData.indicator ||
                            (month === 'FIRSTDAY' ? 'Y' : 'N');
                          return (
                            <TR
                              key={`${school.SCHOOL_NUMBER}-${month}-${idx}`}
                              className={
                                month === 'FIRSTDAY' ? 'bg-blue-50' : ''
                              }
                            >
                              {idx === 0 && (
                                <TD
                                  rowSpan={drills.length}
                                  className="align-top"
                                >
                                  <div className="flex items-center gap-2">
                                    <Calendar
                                      className={`w-5 h-5 flex-shrink-0 ${month === 'FIRSTDAY'
                                        ? 'text-blue-600'
                                        : 'text-gray-500'
                                        }`}
                                    />
                                    <span>{monthLabels[month]}</span>
                                  </div>
                                </TD>
                              )}
                              <TD>
                                <div className="flex items-center gap-2">
                                  {rowData.type === 'SECURITY' ? (
                                    <Shield className="w-5 h-5 flex-shrink-0 text-blue-600" />
                                  ) : (
                                    <Flame className="w-5 h-5 flex-shrink-0 text-orange-500" />
                                  )}
                                  <Select
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
                                    className="w-full"
            disabled={month === 'FIRSTDAY'}
                                  >
                                    <option value="FIRE">Fire Drill</option>
                                    <option value="SECURITY">
                                      Security Drill
                                    </option>
                                  </Select>
                                </div>
                              </TD>
                              <TD>
                                <div className="flex items-center gap-2">
                                  {indicator === 'Y' ? (
                                    <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
                                  ) : (
                                    <XCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                                  )}
                                  <Select
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
                                    className="w-full"
            disabled={month === 'FIRSTDAY'}
                                  >
                                    <option value="Y">Yes</option>
                                    <option value="N">No</option>
                                  </Select>
                                </div>
                              </TD>
                              <TD>
                                <div className="flex items-center gap-2">
                                  <Input
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
                                    className="w-full"
                                  />
                                </div>
                                {rowData.dateErrors?.map((err, i) => (
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
                              </TD>
                              <TD>
                                <Select
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
                  disabled={indicator === 'Y' || month === 'FIRSTDAY'}
                                  className="w-full"
                                >
                                  <option value="">-</option>
                                  <option value="01">01 - No Students</option>
                                  <option value="02">
                                    02 - Not in Session
                                  </option>
                                  <option value="03">03 - Other</option>
                                </Select>
                                {rowData.reasonErrors?.map((err, i) => (
                                  <p
                                    key={i}
                                    className="text-red-600 text-xs mt-1"
                                  >
                                    {err}
                                  </p>
                                ))}
                              </TD>
                              <TD>
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-5 h-5 flex-shrink-0 text-gray-500" />
                                  <Input
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
                                    className="w-full"
                                  />
                                </div>
                                {rowData.commentErrors?.map((err, i) => (
                                  <p
                                    key={i}
                                    className="text-red-600 text-xs mt-1"
                                  >
                                    {err}
                                  </p>
                                ))}
                              </TD>
                              <TD className="text-center">
                                <div className="inline-flex items-center gap-2">
                                  {idx === drills.length - 1 && canAddAny && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="rounded-full text-green-700 border-green-200 hover:bg-green-50"
                                      aria-label="Add drill row"
                                      title="Add drill row"
                                      onClick={() => addDrillRow(school.SCHOOL_NUMBER, month)}
                                    >
                                      <PlusCircle className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {idx > 0 && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="rounded-full text-red-700 border-red-200 hover:bg-red-50"
                                      aria-label="Remove this row"
                                      title="Remove this row"
                                      onClick={() =>
                                        removeDrillRow(
                                          school.SCHOOL_NUMBER,
                                          month,
                                          idx
                                        )
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TD>
                            </TR>
                          );
                        });
                      })}
                    </TBody>
                  </Table>
                </div>
              </section>
            ))}
          </>
        )}

        {/* Export */}
        {selectedAUN && schools.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-6">
            <Button
              onClick={exportCSV}
              disabled={!isValid}
              className={`px-8 py-3 text-lg ${!isValid ? 'bg-gray-400 cursor-not-allowed' : ''}`}
            >
              <Download className="inline-block mr-2" />
              Export CSV for PIMS
            </Button>
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
