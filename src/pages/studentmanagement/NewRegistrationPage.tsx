import { useState, type FormEvent } from "react";
import { Camera, Mail, MessageSquare, UserPlus } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";
const requiredLabelClasses = `${labelClasses} after:ml-0.5 after:text-marigold-dark after:content-['*']`;

type Tab = "basic" | "personal" | "address";

const TABS: { id: Tab; label: string }[] = [
  { id: "basic", label: "Basic Information" },
  { id: "personal", label: "Personal & Parents Details" },
  { id: "address", label: "Address & Documents" },
];

interface BasicInfo {
  session: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  guardianName: string;
  gender: "male" | "female" | "other";
  dob: string;
  age: string;
  category: "general" | "obc" | "sc" | "st" | "ewc" | "ph";
  nationality: string;
  religion: string;
  subReligion: string;
  mobile1: string;
  mobile2: string;
  email: string;
  whatsappNo: string;
  motherTongue: string;
  secondLanguage: string;
  thirdLanguage: string;
  transportMode: string;
  medicalHistory: string;
  aadhaarNo: string;
  satsNo: string;
  penNo: string;
  onlyChild: boolean;
  studentType: "dayscholar" | "boarder";
  teachersWard: string;
  lastClass: string;
  lastSchool: string;
  lastSchoolPercent: string;
  lastSchoolTc: string;
  lastSchoolBoard: string;
  classApplying: string;
  registrationDate: string;
}

const EMPTY_BASIC: BasicInfo = {
  session: "2026-27",
  studentName: "",
  fatherName: "",
  motherName: "",
  guardianName: "",
  gender: "male",
  dob: "",
  age: "",
  category: "general",
  nationality: "Indian",
  religion: "",
  subReligion: "",
  mobile1: "",
  mobile2: "",
  email: "",
  whatsappNo: "",
  motherTongue: "",
  secondLanguage: "",
  thirdLanguage: "",
  transportMode: "self",
  medicalHistory: "",
  aadhaarNo: "",
  satsNo: "",
  penNo: "",
  onlyChild: false,
  studentType: "dayscholar",
  teachersWard: "no",
  lastClass: "",
  lastSchool: "",
  lastSchoolPercent: "",
  lastSchoolTc: "",
  lastSchoolBoard: "",
  classApplying: "",
  registrationDate: new Date().toISOString().slice(0, 10),
};

interface PersonalInfo {
  fatherOccupation: string;
  fatherQualification: string;
  fatherMobile: string;
  fatherEmail: string;
  fatherAadhaar: string;
  motherOccupation: string;
  motherQualification: string;
  motherMobile: string;
  motherEmail: string;
  motherAadhaar: string;
  guardianRelation: string;
  guardianMobile: string;
  annualIncome: string;
  bloodGroup: string;
}

const EMPTY_PERSONAL: PersonalInfo = {
  fatherOccupation: "",
  fatherQualification: "",
  fatherMobile: "",
  fatherEmail: "",
  fatherAadhaar: "",
  motherOccupation: "",
  motherQualification: "",
  motherMobile: "",
  motherEmail: "",
  motherAadhaar: "",
  guardianRelation: "",
  guardianMobile: "",
  annualIncome: "",
  bloodGroup: "",
};

interface AddressInfo {
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentPincode: string;
  sameAsCurrent: boolean;
  permanentAddress: string;
  permanentCity: string;
  permanentState: string;
  permanentPincode: string;
}

const EMPTY_ADDRESS: AddressInfo = {
  currentAddress: "",
  currentCity: "",
  currentState: "",
  currentPincode: "",
  sameAsCurrent: true,
  permanentAddress: "",
  permanentCity: "",
  permanentState: "",
  permanentPincode: "",
};

const DOCUMENT_SLOTS = [
  "Student Photo",
  "Birth Certificate",
  "Aadhaar Card",
  "Previous School TC",
  "Caste Certificate",
];

function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-3.5 w-3.5 accent-marigold"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function NewRegistrationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [basic, setBasic] = useState<BasicInfo>(EMPTY_BASIC);
  const [personal, setPersonal] = useState<PersonalInfo>(EMPTY_PERSONAL);
  const [address, setAddress] = useState<AddressInfo>(EMPTY_ADDRESS);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function updateBasic<K extends keyof BasicInfo>(key: K, value: BasicInfo[K]) {
    setBasic((prev) => ({ ...prev, [key]: value }));
  }

  function updatePersonal<K extends keyof PersonalInfo>(key: K, value: PersonalInfo[K]) {
    setPersonal((prev) => ({ ...prev, [key]: value }));
  }

  function updateAddress<K extends keyof AddressInfo>(key: K, value: AddressInfo[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = Boolean(basic.studentName.trim() && basic.dob && basic.classApplying);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    // UI-only for now — no registration API exists yet on the backend.
    setSavedMessage("Form captured locally. Registration API isn't wired up yet.");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Student Management · Registration</p>
        <h1 className="mt-1 font-display text-2xl text-ink">New Registration</h1>
      </div>

      <SectionCard title="Student Registration" icon={UserPlus}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Registration No / Session strip, always visible above the tabs */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className={labelClasses}>Registration No</label>
              <input value="Auto-generated on save" readOnly className={`${inputClasses} cursor-not-allowed bg-chalk/60 text-ink-soft`} />
            </div>
            <div className="space-y-1">
              <label htmlFor="reg-session" className={labelClasses}>Session</label>
              <input
                id="reg-session"
                value={basic.session}
                onChange={(e) => updateBasic("session", e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="reg-date" className={labelClasses}>Registration Date</label>
              <input
                id="reg-date"
                type="date"
                value={basic.registrationDate}
                onChange={(e) => updateBasic("registrationDate", e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-line">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border border-b-0 border-line bg-white text-marigold-dark"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="studentName" className={requiredLabelClasses}>Student Name</label>
                    <input
                      id="studentName"
                      value={basic.studentName}
                      onChange={(e) => updateBasic("studentName", e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="fatherName" className={labelClasses}>Father's Name</label>
                    <input
                      id="fatherName"
                      value={basic.fatherName}
                      onChange={(e) => updateBasic("fatherName", e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="motherName" className={labelClasses}>Mother's Name</label>
                    <input
                      id="motherName"
                      value={basic.motherName}
                      onChange={(e) => updateBasic("motherName", e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="guardianName" className={labelClasses}>Guardian's Name</label>
                    <input
                      id="guardianName"
                      value={basic.guardianName}
                      onChange={(e) => updateBasic("guardianName", e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                </div>

                {/* Photo upload */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-line bg-chalk/60 text-ink-soft">
                    <Camera size={22} />
                  </div>
                  <label className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-chalk">
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClasses}>Gender</label>
                <RadioGroup
                  name="gender"
                  value={basic.gender}
                  onChange={(v) => updateBasic("gender", v)}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="dob" className={requiredLabelClasses}>Date of Birth</label>
                  <input
                    id="dob"
                    type="date"
                    value={basic.dob}
                    onChange={(e) => updateBasic("dob", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="age" className={labelClasses}>Age</label>
                  <input
                    id="age"
                    value={basic.age}
                    onChange={(e) => updateBasic("age", e.target.value)}
                    placeholder="Auto / manual"
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="classApplying" className={requiredLabelClasses}>Class Applying</label>
                  <input
                    id="classApplying"
                    value={basic.classApplying}
                    onChange={(e) => updateBasic("classApplying", e.target.value)}
                    placeholder="e.g. Class 6"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClasses}>Category</label>
                <RadioGroup
                  name="category"
                  value={basic.category}
                  onChange={(v) => updateBasic("category", v)}
                  options={[
                    { value: "general", label: "General" },
                    { value: "obc", label: "OBC" },
                    { value: "sc", label: "SC" },
                    { value: "st", label: "ST" },
                    { value: "ewc", label: "EWC" },
                    { value: "ph", label: "PH" },
                  ]}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="nationality" className={labelClasses}>Nationality</label>
                  <input
                    id="nationality"
                    value={basic.nationality}
                    onChange={(e) => updateBasic("nationality", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="religion" className={labelClasses}>Religion</label>
                  <input
                    id="religion"
                    value={basic.religion}
                    onChange={(e) => updateBasic("religion", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="subReligion" className={labelClasses}>Sub-Religion</label>
                  <input
                    id="subReligion"
                    value={basic.subReligion}
                    onChange={(e) => updateBasic("subReligion", e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor="mobile1" className={labelClasses}>Mobile No (1st)</label>
                  <input
                    id="mobile1"
                    inputMode="tel"
                    value={basic.mobile1}
                    onChange={(e) => updateBasic("mobile1", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="mobile2" className={labelClasses}>Mobile No (2nd)</label>
                  <input
                    id="mobile2"
                    inputMode="tel"
                    value={basic.mobile2}
                    onChange={(e) => updateBasic("mobile2", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="email" className={labelClasses}>Email</label>
                  <input
                    id="email"
                    type="email"
                    value={basic.email}
                    onChange={(e) => updateBasic("email", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="whatsappNo" className={labelClasses}>Whatsapp No</label>
                  <input
                    id="whatsappNo"
                    inputMode="tel"
                    value={basic.whatsappNo}
                    onChange={(e) => updateBasic("whatsappNo", e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="motherTongue" className={labelClasses}>Mother Tongue</label>
                  <input
                    id="motherTongue"
                    value={basic.motherTongue}
                    onChange={(e) => updateBasic("motherTongue", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="secondLanguage" className={labelClasses}>2nd Language</label>
                  <input
                    id="secondLanguage"
                    value={basic.secondLanguage}
                    onChange={(e) => updateBasic("secondLanguage", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="thirdLanguage" className={labelClasses}>3rd Language</label>
                  <input
                    id="thirdLanguage"
                    value={basic.thirdLanguage}
                    onChange={(e) => updateBasic("thirdLanguage", e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="transportMode" className={labelClasses}>Transport Mode</label>
                  <select
                    id="transportMode"
                    value={basic.transportMode}
                    onChange={(e) => updateBasic("transportMode", e.target.value)}
                    className={inputClasses}
                  >
                    <option value="self">Self</option>
                    <option value="school-transport">School Transport</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="medicalHistory" className={labelClasses}>Medical History</label>
                  <input
                    id="medicalHistory"
                    value={basic.medicalHistory}
                    onChange={(e) => updateBasic("medicalHistory", e.target.value)}
                    placeholder="None"
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="teachersWard" className={labelClasses}>Teacher's Ward</label>
                  <select
                    id="teachersWard"
                    value={basic.teachersWard}
                    onChange={(e) => updateBasic("teachersWard", e.target.value)}
                    className={inputClasses}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="aadhaarNo" className={labelClasses}>Aadhaar No</label>
                  <input
                    id="aadhaarNo"
                    value={basic.aadhaarNo}
                    onChange={(e) => updateBasic("aadhaarNo", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="satsNo" className={labelClasses}>SATS No</label>
                  <input
                    id="satsNo"
                    value={basic.satsNo}
                    onChange={(e) => updateBasic("satsNo", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="penNo" className={labelClasses}>PEN No</label>
                  <input
                    id="penNo"
                    value={basic.penNo}
                    onChange={(e) => updateBasic("penNo", e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={basic.onlyChild}
                    onChange={(e) => updateBasic("onlyChild", e.target.checked)}
                    className="h-3.5 w-3.5 accent-marigold"
                  />
                  Only Child
                </label>
                <RadioGroup
                  name="studentType"
                  value={basic.studentType}
                  onChange={(v) => updateBasic("studentType", v)}
                  options={[
                    { value: "dayscholar", label: "Day Scholar" },
                    { value: "boarder", label: "Boarder" },
                  ]}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="lastClass" className={labelClasses}>Last Class</label>
                  <input
                    id="lastClass"
                    value={basic.lastClass}
                    onChange={(e) => updateBasic("lastClass", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="lastSchool" className={labelClasses}>Last School</label>
                  <input
                    id="lastSchool"
                    value={basic.lastSchool}
                    onChange={(e) => updateBasic("lastSchool", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="lastSchoolPercent" className={labelClasses}>Last School %</label>
                  <input
                    id="lastSchoolPercent"
                    value={basic.lastSchoolPercent}
                    onChange={(e) => updateBasic("lastSchoolPercent", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="lastSchoolTc" className={labelClasses}>Last School TC No</label>
                  <input
                    id="lastSchoolTc"
                    value={basic.lastSchoolTc}
                    onChange={(e) => updateBasic("lastSchoolTc", e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="lastSchoolBoard" className={labelClasses}>Last School Board</label>
                  <input
                    id="lastSchoolBoard"
                    value={basic.lastSchoolBoard}
                    onChange={(e) => updateBasic("lastSchoolBoard", e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "personal" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-ink">Father's Details</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="fatherOccupation" className={labelClasses}>Occupation</label>
                  <input id="fatherOccupation" value={personal.fatherOccupation} onChange={(e) => updatePersonal("fatherOccupation", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="fatherQualification" className={labelClasses}>Qualification</label>
                  <input id="fatherQualification" value={personal.fatherQualification} onChange={(e) => updatePersonal("fatherQualification", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="fatherMobile" className={labelClasses}>Mobile</label>
                  <input id="fatherMobile" inputMode="tel" value={personal.fatherMobile} onChange={(e) => updatePersonal("fatherMobile", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="fatherEmail" className={labelClasses}>Email</label>
                  <input id="fatherEmail" type="email" value={personal.fatherEmail} onChange={(e) => updatePersonal("fatherEmail", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="fatherAadhaar" className={labelClasses}>Aadhaar No</label>
                  <input id="fatherAadhaar" value={personal.fatherAadhaar} onChange={(e) => updatePersonal("fatherAadhaar", e.target.value)} className={inputClasses} />
                </div>
              </div>

              <p className="pt-2 text-sm font-medium text-ink">Mother's Details</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="motherOccupation" className={labelClasses}>Occupation</label>
                  <input id="motherOccupation" value={personal.motherOccupation} onChange={(e) => updatePersonal("motherOccupation", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="motherQualification" className={labelClasses}>Qualification</label>
                  <input id="motherQualification" value={personal.motherQualification} onChange={(e) => updatePersonal("motherQualification", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="motherMobile" className={labelClasses}>Mobile</label>
                  <input id="motherMobile" inputMode="tel" value={personal.motherMobile} onChange={(e) => updatePersonal("motherMobile", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="motherEmail" className={labelClasses}>Email</label>
                  <input id="motherEmail" type="email" value={personal.motherEmail} onChange={(e) => updatePersonal("motherEmail", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="motherAadhaar" className={labelClasses}>Aadhaar No</label>
                  <input id="motherAadhaar" value={personal.motherAadhaar} onChange={(e) => updatePersonal("motherAadhaar", e.target.value)} className={inputClasses} />
                </div>
              </div>

              <p className="pt-2 text-sm font-medium text-ink">Guardian & Other Details</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor="guardianRelation" className={labelClasses}>Relation with Student</label>
                  <input id="guardianRelation" value={personal.guardianRelation} onChange={(e) => updatePersonal("guardianRelation", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="guardianMobile" className={labelClasses}>Guardian Mobile</label>
                  <input id="guardianMobile" inputMode="tel" value={personal.guardianMobile} onChange={(e) => updatePersonal("guardianMobile", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="annualIncome" className={labelClasses}>Annual Family Income</label>
                  <input id="annualIncome" value={personal.annualIncome} onChange={(e) => updatePersonal("annualIncome", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="bloodGroup" className={labelClasses}>Blood Group</label>
                  <input id="bloodGroup" value={personal.bloodGroup} onChange={(e) => updatePersonal("bloodGroup", e.target.value)} className={inputClasses} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "address" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-ink">Current Address</p>
              <div className="space-y-1">
                <label htmlFor="currentAddress" className={labelClasses}>Address</label>
                <textarea
                  id="currentAddress"
                  rows={2}
                  value={address.currentAddress}
                  onChange={(e) => updateAddress("currentAddress", e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="currentCity" className={labelClasses}>City</label>
                  <input id="currentCity" value={address.currentCity} onChange={(e) => updateAddress("currentCity", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="currentState" className={labelClasses}>State</label>
                  <input id="currentState" value={address.currentState} onChange={(e) => updateAddress("currentState", e.target.value)} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="currentPincode" className={labelClasses}>Pincode</label>
                  <input id="currentPincode" value={address.currentPincode} onChange={(e) => updateAddress("currentPincode", e.target.value)} className={inputClasses} />
                </div>
              </div>

              <label className="flex items-center gap-1.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={address.sameAsCurrent}
                  onChange={(e) => updateAddress("sameAsCurrent", e.target.checked)}
                  className="h-3.5 w-3.5 accent-marigold"
                />
                Permanent address same as current
              </label>

              {!address.sameAsCurrent && (
                <div className="space-y-4 rounded-md border border-line bg-chalk/40 p-4">
                  <p className="text-sm font-medium text-ink">Permanent Address</p>
                  <div className="space-y-1">
                    <label htmlFor="permanentAddress" className={labelClasses}>Address</label>
                    <textarea
                      id="permanentAddress"
                      rows={2}
                      value={address.permanentAddress}
                      onChange={(e) => updateAddress("permanentAddress", e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label htmlFor="permanentCity" className={labelClasses}>City</label>
                      <input id="permanentCity" value={address.permanentCity} onChange={(e) => updateAddress("permanentCity", e.target.value)} className={inputClasses} />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="permanentState" className={labelClasses}>State</label>
                      <input id="permanentState" value={address.permanentState} onChange={(e) => updateAddress("permanentState", e.target.value)} className={inputClasses} />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="permanentPincode" className={labelClasses}>Pincode</label>
                      <input id="permanentPincode" value={address.permanentPincode} onChange={(e) => updateAddress("permanentPincode", e.target.value)} className={inputClasses} />
                    </div>
                  </div>
                </div>
              )}

              <p className="pt-2 text-sm font-medium text-ink">Documents</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DOCUMENT_SLOTS.map((doc) => (
                  <div key={doc} className="space-y-1">
                    <label className={labelClasses}>{doc}</label>
                    <input type="file" className={`${inputClasses} cursor-pointer py-1.5 file:mr-3 file:rounded file:border-0 file:bg-chalk file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-ink-soft`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-5 border-t border-line pt-4">
            <label className="flex items-center gap-1.5 text-sm text-ink-soft">
              <input type="checkbox" className="h-3.5 w-3.5 accent-marigold" />
              <MessageSquare size={14} /> SMS
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink-soft">
              <input type="checkbox" className="h-3.5 w-3.5 accent-marigold" />
              WhatsApp
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink-soft">
              <input type="checkbox" className="h-3.5 w-3.5 accent-marigold" />
              <Mail size={14} /> Email
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={15} />
              Save Registration
            </button>
            {savedMessage && <p className="text-xs text-ink-soft">{savedMessage}</p>}
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

export default NewRegistrationPage;
