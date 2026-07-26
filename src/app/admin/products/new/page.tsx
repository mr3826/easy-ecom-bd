import { ProductEditorForm } from "@/components/admin/product-editor-form";
import { listBrands, listCategories, listProductImages, listProducts } from "@/server/store";

export default async function AdminProductNewPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
  }>;
}) {
  const { edit = "" } = await searchParams;
  const [products, categories, brands, productImages] = await Promise.all([
    listProducts(),
    listCategories(),
    listBrands(),
    listProductImages(),
  ]);

  const selected = products.find((product) => product.id === edit) ?? null;
  const selectedImages = selected ? productImages.filter((image) => image.productId === selected.id) : [];

  return (
    <div className="space-y-8 text-slate-100">
      <ProductEditorForm
        product={selected}
        categories={categories}
        brands={brands}
        existingImages={selectedImages}
        listHref="/admin/products"
        createHref="/admin/products/new"
      />
    </div>
  );
}
