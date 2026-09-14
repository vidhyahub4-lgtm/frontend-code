import { useState } from "react";
import { Eraser, Eye as EyeIcon, Printer, Search, Sheet } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const secondaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-chalk";
const primaryButtonClasses =
  "flex items-center justify-center gap-1.5 rounded-md bg-marigold px-3 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark";

const SELECT_KEY_OPTIONS = ["Name", "Father Name", "Mother Name", "Mobile No", "Aadhaar No"];
const FORMAT_OPTIONS = ["Reg Records", "Admission Records"];

interface RegisteredStudentRow {
  _id: string;
  regNo: string;
  regDate: string;
  regRcpt: string;
  admNo: string;
  admDate: string;
  admRcpt: string;
  session: string;
  name: string;
  fatherName: string;
  motherName: string;
  gender: string;
  dob: string;
}

function ViewRegisteredStudentPage() {
  const [searchBy, setSearchBy] = useState<"registration" | "admission">("registration");
  const [regInput, setRegInput] = useState("");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectKey, setSelectKey] = useState(SELECT_KEY_OPTIONS[0]);
  const [searchValue, setSearchValue] = useState("");
  const [keyword, setKeyword] = useState("");
  const [format, setFormat] = useState(FORMAT_OPTIONS[0]);

  // No "list registered students" API exists on the backend yet, so this
  // table is wired up and ready but always starts empty.
  const [students] = useState<RegisteredStudentRow[]>([]);

  function handleClearAll() {
    setRegInput("");
    setSearchValue("");
    setKeyword("");
    setFromDate(new Date().toISOString().slice(0, 10));
    setToDate(new Date().toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Registration</p>
        <h1 className="mt-1 font-display text-2xl text-ink">View Registered Student</h1>
      </div>

      <SectionCard title="Search Registered Student" icon={Search}>
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="radio"
                    name="searchBy"
                    checked={searchBy === "registration"}
                    onChange={() => setSearchBy("registration")}
                    className="h-3.5 w-3.5 accent-marigold"
                  />
                  Registration number
                </label>
                <label className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="radio"
                    name="searchBy"
                    checked={searchBy === "admission"}
                    onChange={() => setSearchBy("admission")}
                    className="h-3.5 w-3.5 accent-marigold"
                  />
                  Admission number
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  value={regInput}
                  onChange={(e) => setRegInput(e.target.value)}
                  placeholder={searchBy === "registration" ? "Enter reg no" : "Enter admission no"}
                  className={inputClasses}
                />
                <button type="button" className={`${primaryButtonClasses} shrink-0`}>
                  <Search size={14} /> Get Detail
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="fromDate" className={labelClasses}>Select From</label>
                  <input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="toDate" className={labelClasses}>To</label>
                  <input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClasses} />
                </div>
              </div>
              <button type="button" className={`${primaryButtonClasses} w-full`}>
                <Search size={14} /> Get Detail
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="selectKey" className={labelClasses}>Select Key</label>
              <select id="selectKey" value={selectKey} onChange={(e) => setSelectKey(e.target.value)} className={inputClasses}>
                {SELECT_KEY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Enter search value"
                  className={inputClasses}
                />
                <button type="button" className={`${primaryButtonClasses} shrink-0`}>
                  <Search size={14} /> Get Detail
                </button>
              </div>
            </div>
          </div>

          <button type="button" onClick={handleClearAll} className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100">
            <Eraser size={14} /> Clear All
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Registered Students" icon={EyeIcon}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setKeyword("")} className={secondaryButtonClasses}>
              <Eraser size={14} /> Clear
            </button>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search keyword"
              className={`${inputClasses} max-w-xs`}
            />
            <button type="button" className={secondaryButtonClasses}>
              <Sheet size={14} /> Export
            </button>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className={`${inputClasses} max-w-[10rem]`}>
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <button type="button" className={secondaryButtonClasses}>
              <Printer size={14} /> Print View
            </button>
          </div>

          <EntityTable<RegisteredStudentRow>
            items={students}
            isLoading={false}
            error={null}
            emptyLabel="No registered students found."
            getRowKey={(item) => item._id}
            columns={[
              { header: "Reg No", render: (item) => item.regNo },
              { header: "Reg Date", render: (item) => item.regDate },
              { header: "Reg Rcpt", render: (item) => item.regRcpt },
              { header: "Adm No", render: (item) => item.admNo },
              { header: "Adm Date", render: (item) => item.admDate },
              { header: "Adm Rcpt", render: (item) => item.admRcpt },
              { header: "Session", render: (item) => item.session },
              { header: "Name", render: (item) => <span className="font-medium">{item.name}</span> },
              { header: "Father Name", render: (item) => item.fatherName },
              { header: "Mother Name", render: (item) => item.motherName },
              { header: "Gender", render: (item) => item.gender },
              { header: "DOB", render: (item) => item.dob },
            ]}
          />

          <p className="text-sm text-ink-soft">Total No of Students Found: {students.length}</p>
        </div>
      </SectionCard>
    </div>
  );
}

export default ViewRegisteredStudentPage;
