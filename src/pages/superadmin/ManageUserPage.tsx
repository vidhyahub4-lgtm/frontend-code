import { useState, type FormEvent } from "react";
import { UserPlus, Users } from "lucide-react";
import { SectionCard } from "../../components/common/SectionCard";
import { EntityTable } from "../../components/common/EntityTable";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { userService } from "../../services/user.service";
import type { CreateUserRequest, User, UserType } from "../../types/user.types";

const inputClasses =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-marigold/40";
const labelClasses = "text-sm font-medium text-ink-soft";

const USER_TYPES: { value: UserType; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "superAdmin", label: "Super Admin" },
];

const EMPTY_FORM = {
  firstname: "",
  lastname: "",
  loginUserName: "",
  email: "",
  phoneno: "",
  password: "",
  userType: "admin" as UserType,
};

function RoleBadge({ userType }: { userType: UserType }) {
  const isSuperAdmin = userType === "superAdmin";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isSuperAdmin ? "bg-marigold/15 text-marigold-dark" : "bg-chalkboard/10 text-chalkboard"
      }`}
    >
      {isSuperAdmin ? "Super Admin" : "Admin"}
    </span>
  );
}

function ManageUserPage() {
  const { items, isLoading, loadError, isCreating, createError, createEntity } =
    useEntityCrud<User, CreateUserRequest>({
      fetchList: () => userService.getUsers().then((res) => res.users ?? []),
      create: (payload) => userService.createUser(payload),
    });

  const [form, setForm] = useState(EMPTY_FORM);

  function updateField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit =
    form.firstname.trim() &&
    form.lastname.trim() &&
    form.loginUserName.trim() &&
    form.email.trim() &&
    form.phoneno.trim() &&
    form.password.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const ok = await createEntity({
      firstname: form.firstname.trim(),
      lastname: form.lastname.trim(),
      loginUserName: form.loginUserName.trim(),
      email: form.email.trim(),
      phoneno: Number(form.phoneno),
      password: form.password,
      userType: form.userType,
    });

    if (ok) setForm(EMPTY_FORM);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-marigold-dark">Super Admin</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Manage User</h1>
      </div>

      <SectionCard title="Add New User" icon={UserPlus}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="firstname" className={labelClasses}>First name</label>
              <input
                id="firstname"
                value={form.firstname}
                onChange={(e) => updateField("firstname", e.target.value)}
                placeholder="Santosh"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lastname" className={labelClasses}>Last name</label>
              <input
                id="lastname"
                value={form.lastname}
                onChange={(e) => updateField("lastname", e.target.value)}
                placeholder="Kumar"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="loginUserName" className={labelClasses}>Username</label>
              <input
                id="loginUserName"
                value={form.loginUserName}
                onChange={(e) => updateField("loginUserName", e.target.value)}
                placeholder="santosh123"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="email" className={labelClasses}>Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="santosh@gmail.com"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="phoneno" className={labelClasses}>Phone number</label>
              <input
                id="phoneno"
                type="tel"
                inputMode="numeric"
                value={form.phoneno}
                onChange={(e) => updateField("phoneno", e.target.value)}
                placeholder="9876543210"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className={labelClasses}>Password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="userType" className={labelClasses}>Role</label>
              <select
                id="userType"
                value={form.userType}
                onChange={(e) => updateField("userType", e.target.value as UserType)}
                className={inputClasses}
              >
                {USER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {createError && (
            <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2 text-sm text-red-600">
              {createError}
            </p>
          )}

          <button
            type="submit"
            disabled={isCreating || !canSubmit}
            className="flex items-center justify-center gap-1.5 rounded-md bg-marigold px-4 py-2 text-sm font-medium text-chalkboard transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus size={15} />
            {isCreating ? "Creating…" : "Create User"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="All Users" icon={Users}>
        <EntityTable<User>
          items={items}
          isLoading={isLoading}
          error={loadError}
          emptyLabel="No users found."
          getRowKey={(item) => item._id}
          columns={[
            {
              header: "Name",
              render: (item) => (
                <span className="font-medium">
                  {item.firstname} {item.lastname}
                </span>
              ),
            },
            { header: "Username", render: (item) => item.loginUserName },
            { header: "Email", render: (item) => item.email },
            { header: "Phone", render: (item) => item.phoneno },
            { header: "Role", render: (item) => <RoleBadge userType={item.userType} /> },
          ]}
        />
      </SectionCard>
    </div>
  );
}

export default ManageUserPage;
