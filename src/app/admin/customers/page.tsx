import { listUsers } from "@/server/store";
import { StatusPill } from "@/components/status-pill";

export default async function AdminCustomersPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Customers</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Customer management</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {users.map((user) => (
          <div key={user.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{user.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{user.email}</p>
              </div>
              <StatusPill label={user.role} tone={user.role === "admin" ? "active" : "processing"} />
            </div>
            <p className="mt-4 text-sm text-slate-300">{user.phone ?? "No phone"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
