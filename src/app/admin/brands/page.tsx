import { deleteBrandAction, saveBrandAction } from "@/app/admin/actions";
import { listBrands } from "@/server/store";
import { AdminTaxonomyPage } from "@/components/admin-taxonomy-page";
import type { Brand } from "@/lib/domain";

const AdminBrandsPageContent = AdminTaxonomyPage<Brand>({
  listFunction: listBrands,
  saveAction: saveBrandAction,
  deleteAction: deleteBrandAction,
  singularLabel: "Brand",
  pluralLabel: "Brands",
  editHrefPrefix: "admin/brands",
});

export default AdminBrandsPageContent;
