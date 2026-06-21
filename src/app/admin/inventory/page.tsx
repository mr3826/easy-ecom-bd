import { adjustInventoryAction } from "@/app/admin/actions";
import { listProducts, getState } from "@/server/store";
import { money } from "@/lib/utils";

export default function AdminInventoryPage() {
  const products = listProducts();
  const state = getState();

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Inventory</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Stock control</h1>
      </div>

      <form action={adjustInventoryAction} className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 md:grid-cols-4">
        <label className="grid gap-2 text-sm">
          <span>Product</span>
          <select name="productId" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span>Change</span>
          <input name="change" type="number" defaultValue={1} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2 text-sm md:col-span-2">
          <span>Reason</span>
          <input name="reason" defaultValue="Manual stock adjustment" className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">Apply change</button>
      </form>

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-5 py-4 text-left font-medium">Product</th>
              <th className="px-5 py-4 text-left font-medium">Stock</th>
              <th className="px-5 py-4 text-left font-medium">Price</th>
              <th className="px-5 py-4 text-left font-medium">Recent logs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {products.map((product) => {
              const log = state.inventoryLogs.find((entry) => entry.productId === product.id);
              return (
                <tr key={product.id}>
                  <td className="px-5 py-4 text-white">{product.name}</td>
                  <td className="px-5 py-4 text-slate-300">{product.stock}</td>
                  <td className="px-5 py-4 text-slate-300">{money(product.price)}</td>
                  <td className="px-5 py-4 text-slate-400">{log ? `${log.reason} (${log.change})` : "None yet"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

