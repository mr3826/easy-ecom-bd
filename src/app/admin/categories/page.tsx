import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { listCategories } from "@/server/store";
import { AdminTaxonomyPage } from "@/components/admin-taxonomy-page";
import type { Category } from "@/lib/domain";

const AdminCategoriesPageContent = AdminTaxonomyPage<Category>({
  listFunction: listCategories,
  saveAction: saveCategoryAction,
  deleteAction: deleteCategoryAction,
  singularLabel: "Category",
  pluralLabel: "Categories",
  editHrefPrefix: "admin/categories",
});

export default AdminCategoriesPageContent;
